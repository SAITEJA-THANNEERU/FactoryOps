import dotenv from 'dotenv';
dotenv.config({ override: true });

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, verifyPassword, hashPassword, generateSalt, calculateHaversineDistance } from './server/db.ts';
import { supabaseAdapter, testSupabaseConnection, getActiveDataSource, getDetailedSystemStatus } from './server/supabase.ts';
import type { User, UserRole, Incident, WorkOrder, Machine, FactoryLocation, AttendanceRecord, AttendanceAuditLog } from './src/types/index.ts';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-factory-id');
  if (req.path.startsWith('/api')) {
    res.setHeader('X-Data-Source', getActiveDataSource());
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json());

// Extend express Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    factory_id: string | null;
  };
}

// Authentication middleware
function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const session = db.sessions.get(token);

  if (!session || session.expiresAt < Date.now()) {
    if (session) db.sessions.delete(token);
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid. Please log in again.' });
    return;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user || user.status !== 'active') {
    res.status(401).json({ error: 'Unauthorized: User account not found or deactivated' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    factory_id: user.factory_id
  };

  next();
}

// Role authorization middleware
function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
      });
      return;
    }
    next();
  };
}

// Helper to determine and enforce factory isolation
function getResolvedFactoryId(req: AuthenticatedRequest, requestedFactoryId?: string): string | null {
  if (!req.user) return null;

  // Super Admin can inspect any factory
  if (req.user.role === 'SUPER_ADMIN') {
    return requestedFactoryId || (req.query.factory_id as string) || (req.headers['x-factory-id'] as string) || null;
  }

  // Factory Owner or Manager is strictly locked to their factory
  const userFactoryId = req.user.factory_id;
  if (!userFactoryId) return null;

  // If a specific factory was requested, verify it matches the user's factory
  const targetId = requestedFactoryId || (req.query.factory_id as string) || (req.headers['x-factory-id'] as string);
  if (targetId && targetId !== userFactoryId) {
    return '__FORBIDDEN__';
  }

  return userFactoryId;
}

// Audit Event Logger Helper
async function logAuditEvent(
  req: AuthenticatedRequest,
  action: string,
  entityType: string,
  entityId: string,
  details: string
) {
  if (!req.user) return;
  try {
    await supabaseAdapter.createSystemAuditLog({
      factory_id: req.user.factory_id || 'FAC-001',
      user_id: req.user.id,
      user_name: req.user.name,
      user_role: req.user.role,
      user_email: req.user.email,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log:', err);
  }
}

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Login endpoint
app.post(['/api/auth/login', '/api/auth/login/'], (req: Request, res: Response): void => {
  const { email, username, password } = req.body || {};
  const identifier = (email || username || '').trim().toLowerCase();

  if (!identifier || !password) {
    res.status(400).json({ success: false, error: 'Username/Email and Password are required' });
    return;
  }

  const user = db.users.find(u => {
    const uEmail = u.email.toLowerCase();
    const uName = u.name.toLowerCase();
    const uUsername = uEmail.split('@')[0];
    return (
      uEmail === identifier ||
      uName === identifier ||
      uUsername === identifier ||
      u.id.toLowerCase() === identifier
    );
  });

  if (!user) {
    res.status(401).json({ success: false, error: 'Invalid email/username or password' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid email/username or password' });
    return;
  }

  // Create session token valid for 24 hours
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  db.sessions.set(token, {
    userId: user.id,
    role: user.role,
    factoryId: user.factory_id,
    expiresAt
  });

  const factory = user.factory_id ? db.factories.find(f => f.id === user.factory_id) : null;

  // Return user without hash or salt
  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    factory_id: user.factory_id,
    factory_name: factory?.name,
    status: user.status,
    created_at: user.created_at
  };

  res.json({
    success: true,
    token,
    user: safeUser,
    factory
  });
});

// Registration endpoint (Manager / Supervisor, Technician, Production Planner ONLY)
const ALLOWED_PUBLIC_ROLES: UserRole[] = ['MANAGER_SUPERVISOR', 'TECHNICIAN', 'PRODUCTION_PLANNER'];

app.post(['/api/auth/register', '/api/auth/register/'], (req: Request, res: Response): void => {
  const { name, email, password, role, factory_id } = req.body || {};

  // 1. Strict Role Authorization: Reject ADMIN and SUPER_ADMIN
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Public registration for Administrative or Super Admin roles is forbidden. Factory Admin creation requires an authorized factory onboarding workflow.'
    });
    return;
  }

  if (!role || !ALLOWED_PUBLIC_ROLES.includes(role)) {
    res.status(400).json({
      success: false,
      error: 'Invalid role selection. Registration is only available for Manager / Supervisor, Technician, and Production Planner.'
    });
    return;
  }

  // 2. Validate Required Fields
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const plainPassword = typeof password === 'string' ? password : '';

  if (!trimmedName || trimmedName.length < 2) {
    res.status(400).json({
      success: false,
      error: 'Full Name is required (minimum 2 characters).'
    });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    res.status(400).json({
      success: false,
      error: 'A valid corporate email address is required.'
    });
    return;
  }

  if (!plainPassword || plainPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long.'
    });
    return;
  }

  // 3. Duplicate Email Check
  const emailExists = db.users.some(u => u.email.toLowerCase() === trimmedEmail);
  if (emailExists) {
    res.status(409).json({
      success: false,
      error: 'An account with this email address already exists. Please sign in or use another email.'
    });
    return;
  }

  // 4. Resolve Factory Assignment
  const assignedFactoryId = factory_id && db.factories.some(f => f.id === factory_id)
    ? factory_id
    : 'FAC-001'; // Default to Austin Gigafactory Precision Engineering (APX-01)
  const factory = db.factories.find(f => f.id === assignedFactoryId);

  // 5. Hash Password with PBKDF2 + Salt
  const salt = generateSalt();
  const password_hash = hashPassword(plainPassword, salt);
  const newUserId = `USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const newUser = {
    id: newUserId,
    name: trimmedName,
    email: trimmedEmail,
    role: role as UserRole,
    factory_id: assignedFactoryId,
    status: 'active' as const,
    created_at: new Date().toISOString(),
    password_hash,
    salt
  };

  db.users.push(newUser);

  // 6. Return Safe Confirmation (Never expose salt or password hash)
  const safeUser: User = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    factory_id: newUser.factory_id,
    factory_name: factory?.name || 'Apex Precision Manufacturing',
    status: newUser.status,
    created_at: newUser.created_at
  };

  res.status(201).json({
    success: true,
    message: 'Account registered successfully. You can now sign in with your credentials.',
    user: safeUser,
    factory: factory || null
  });
});

// Logout endpoint
app.post(['/api/auth/logout', '/api/auth/logout/'], (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.sessions.delete(token);
  }
  res.json({ success: true, message: 'Successfully logged out' });
});

// Current User Me endpoint
app.get(['/api/auth/me', '/api/auth/me/'], authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = db.users.find(u => u.id === req.user!.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const factory = user.factory_id ? db.factories.find(f => f.id === user.factory_id) : null;
  const safeUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    factory_id: user.factory_id,
    factory_name: factory?.name,
    status: user.status,
    created_at: user.created_at
  };

  res.json({
    success: true,
    user: safeUser,
    factory
  });
});

// Refresh Session Token
app.post('/api/auth/refresh', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token && db.sessions.has(token)) {
    const session = db.sessions.get(token)!;
    session.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // extend 24 hours
    db.sessions.set(token, session);
    res.json({
      success: true,
      message: 'Session token extended successfully',
      expiresAt: session.expiresAt
    });
    return;
  }
  res.status(401).json({ success: false, error: 'Session expired or invalid' });
});

// ==========================================
// LOCATION-BASED ATTENDANCE & GEOFENCE ROUTES
// ==========================================

// 1. Get Factory Location & Geofence Configuration
app.get('/api/attendance/factory-location', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const factoryId = getResolvedFactoryId(req) || req.user?.factory_id || 'FAC-001';
  let loc = db.factoryLocations.find(l => l.factory_id === factoryId);

  if (!loc) {
    loc = {
      id: `LOC-${factoryId}`,
      factory_id: factoryId,
      latitude: 17.4435,
      longitude: 78.3772,
      radius_meters: 1000,
      address: 'Sanath Nagar Industrial Estate, Hyderabad, Telangana 500018',
      updated_at: new Date().toISOString(),
      updated_by: 'System Default'
    };
    db.factoryLocations.push(loc);
  }

  res.json(loc);
});

// 2. Configure / Update Factory Location (Admin & Super Admin ONLY)
app.post('/api/attendance/factory-location', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const { factory_id, latitude, longitude, address } = req.body || {};
  const targetFactoryId = factory_id || req.user?.factory_id || 'FAC-001';

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({ error: 'Valid numerical latitude and longitude are required.' });
    return;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({ error: 'Coordinates are out of bounds. Latitude must be -90 to 90, Longitude -180 to 180.' });
    return;
  }

  const radius_meters = 1000; // Strictly enforced 1 km geofence radius
  const nowIso = new Date().toISOString();
  let loc = db.factoryLocations.find(l => l.factory_id === targetFactoryId);

  if (loc) {
    loc.latitude = latitude;
    loc.longitude = longitude;
    loc.radius_meters = radius_meters;
    loc.address = address || loc.address || 'Configured Factory Site';
    loc.updated_at = nowIso;
    loc.updated_by = req.user!.name;
  } else {
    loc = {
      id: `LOC-${targetFactoryId}`,
      factory_id: targetFactoryId,
      latitude,
      longitude,
      radius_meters,
      address: address || 'Configured Factory Site',
      updated_at: nowIso,
      updated_by: req.user!.name
    };
    db.factoryLocations.push(loc);
  }

  // Audit log entry
  db.attendanceAuditLogs.push({
    id: `LOG-${Date.now()}`,
    action: 'LOCATION_UPDATE',
    performed_by_id: req.user!.id,
    performed_by_name: req.user!.name,
    performed_by_role: req.user!.role,
    details: `Updated factory location: Lat ${latitude}, Lon ${longitude}, Radius: 1000m (1 km)`,
    timestamp: nowIso
  });

  res.json({
    success: true,
    message: 'Factory location and 1 km attendance radius updated successfully.',
    location: loc
  });
});

// 3. Employee Mark Present (GPS Geofence Verified)
app.post('/api/attendance/check-in', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { latitude, longitude } = req.body || {};
  const user = req.user!;
  const factoryId = user.factory_id || 'FAC-001';

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    res.status(400).json({ error: 'GPS coordinates (latitude and longitude) are required for check-in verification.' });
    return;
  }

  const loc = db.factoryLocations.find(l => l.factory_id === factoryId) || {
    latitude: 17.4435,
    longitude: 78.3772,
    radius_meters: 1000
  };

  const distance = calculateHaversineDistance(latitude, longitude, loc.latitude, loc.longitude);
  const radius = loc.radius_meters || 1000;
  const today = new Date().toISOString().split('T')[0];

  // Prevent duplicate check-in for the same day
  const existing = db.attendanceRecords.find(r => r.user_id === user.id && r.attendance_date === today);
  if (existing) {
    res.status(409).json({
      error: `Attendance already recorded for today (${today}). Status: ${existing.status} at ${existing.check_in_time}. Duplicate check-ins are not permitted.`,
      record: existing
    });
    return;
  }

  // Reject check-ins outside 1 km (1000 meters)
  if (distance > radius) {
    const distanceDisplay = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${distance} meters`;
    res.status(400).json({
      error: `Check-in rejected: You are ${distanceDisplay} away from the factory premises (allowed geofence radius: 1.0 km / 1,000 m). Please ensure you are within the factory perimeter.`,
      distance_meters: distance,
      radius_meters: radius,
      geofence_passed: false
    });
    return;
  }

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const record: AttendanceRecord = {
    id: `ATT-${user.id}-${today}`,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
    factory_id: factoryId,
    attendance_date: today,
    timestamp: now.toISOString(),
    status: 'Present',
    check_in_time: timeStr,
    latitude,
    longitude,
    distance_meters: distance,
    is_verified: true,
    verification_method: 'GPS_GEOFENCE',
    verification_notes: `GPS location verified within 1 km geofence (${distance}m from factory center)`,
    created_at: now.toISOString()
  };

  db.attendanceRecords.push(record);

  db.attendanceAuditLogs.push({
    id: `LOG-${Date.now()}`,
    attendance_id: record.id,
    action: 'CHECK_IN',
    performed_by_id: user.id,
    performed_by_name: user.name,
    performed_by_role: user.role,
    details: `Employee marked Present. GPS distance verified at ${distance}m (radius: 1000m)`,
    timestamp: now.toISOString()
  });

  res.status(201).json({
    success: true,
    message: `Attendance verified and recorded! Distance: ${distance}m from factory center.`,
    record
  });
});

// 4. Employee Report Absence
app.post('/api/attendance/absence', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const body = req.body || {};
  const targetDate = body.date || body.attendance_date || new Date().toISOString().split('T')[0];
  const reason = body.reason || body.absence_reason;
  const notes = body.notes || body.absence_notes || '';
  const user = req.user!;
  const factoryId = user.factory_id || 'FAC-001';
  const validReasons = ['Sick Leave', 'Emergency', 'Casual Leave', 'Off-Site Duty', 'Other'];
  if (!reason || !validReasons.includes(reason)) {
    res.status(400).json({ error: `Please provide a valid absence reason: ${validReasons.join(', ')}.` });
    return;
  }

  const existingIndex = db.attendanceRecords.findIndex(r => r.user_id === user.id && r.attendance_date === targetDate);
  if (existingIndex >= 0) {
    const existing = db.attendanceRecords[existingIndex];
    if (existing.status === 'Present') {
      res.status(400).json({
        error: `You have already marked Present on ${targetDate}. Verified attendance records cannot be overwritten by employees. Contact Admin for corrections.`
      });
      return;
    }
    res.status(409).json({ error: `An absence report has already been logged for ${targetDate}.` });
    return;
  }

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];

  const record: AttendanceRecord = {
    id: `ATT-${user.id}-${targetDate}`,
    user_id: user.id,
    user_name: user.name,
    user_email: user.email,
    user_role: user.role,
    factory_id: factoryId,
    attendance_date: targetDate,
    timestamp: now.toISOString(),
    status: 'Absent',
    check_in_time: timeStr,
    latitude: null,
    longitude: null,
    distance_meters: null,
    is_verified: true,
    verification_method: 'MANUAL_AUDITED_EXCEPTION',
    absence_reason: reason,
    absence_notes: notes || '',
    created_at: now.toISOString()
  };

  db.attendanceRecords.push(record);

  db.attendanceAuditLogs.push({
    id: `LOG-${Date.now()}`,
    attendance_id: record.id,
    action: 'ABSENCE_REPORT',
    performed_by_id: user.id,
    performed_by_name: user.name,
    performed_by_role: user.role,
    details: `Reported absence for ${targetDate}: ${reason}${notes ? ` - ${notes}` : ''}`,
    timestamp: now.toISOString()
  });

  res.status(201).json({
    success: true,
    message: `Absence reported for ${targetDate}.`,
    record
  });
});

// 5. My Personal Attendance History
app.get('/api/attendance/my', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const records = db.attendanceRecords
    .filter(r => r.user_id === req.user!.id)
    .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.attendance_date === today) || null;

  res.json({
    records,
    todayRecord,
    today
  });
});

// 6. Admin Attendance View (Technicians, Production Planners, and Managers/Supervisors)
app.get('/api/attendance/admin', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const factoryId = getResolvedFactoryId(req) || req.user?.factory_id || 'FAC-001';
  const { date, role, status, employee } = req.query;

  let records = db.attendanceRecords.filter(r => !factoryId || r.factory_id === factoryId);

  // Supported operational roles
  const allowedRoles = ['TECHNICIAN', 'PRODUCTION_PLANNER', 'MANAGER_SUPERVISOR', 'OPERATOR', 'SUPERVISOR', 'ANALYST'];
  records = records.filter(r => allowedRoles.includes(r.user_role));

  if (date) {
    records = records.filter(r => r.attendance_date === date);
  }
  if (role) {
    records = records.filter(r => r.user_role === role);
  }
  if (status) {
    records = records.filter(r => r.status === status);
  }
  if (employee) {
    const q = String(employee).toLowerCase();
    records = records.filter(r => r.user_name.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q));
  }

  records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || b.check_in_time.localeCompare(a.check_in_time));

  // Compute summary KPIs
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = db.attendanceRecords.filter(r => r.attendance_date === today && allowedRoles.includes(r.user_role));
  const distinctFactoryUsers = db.users.filter(u => (!factoryId || u.factory_id === factoryId) && allowedRoles.includes(u.role)).length || 15;

  const presentToday = todayRecords.filter(r => r.status === 'Present').length;
  const absentToday = todayRecords.filter(r => r.status === 'Absent').length;
  const onTimeCheckIns = todayRecords.filter(r => r.status === 'Present' && r.check_in_time <= '08:30:00').length;
  const attendanceRatePct = distinctFactoryUsers > 0 ? Math.round((presentToday / distinctFactoryUsers) * 100) : 0;

  res.json({
    records,
    kpis: {
      totalExpected: distinctFactoryUsers,
      presentToday,
      absentToday,
      attendanceRatePct,
      onTimeCheckIns
    },
    auditLogs: db.attendanceAuditLogs.slice(-20)
  });
});

// 7. Manager Attendance View (TECHNICIANS ONLY - Strict RBAC filtering)
app.get('/api/attendance/manager', authenticate, authorizeRole('MANAGER_SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const factoryId = getResolvedFactoryId(req) || req.user?.factory_id || 'FAC-001';
  const { date, status, employee } = req.query;

  // STRICT ENFORCEMENT: Managers can ONLY view Technicians
  let records = db.attendanceRecords.filter(r => {
    const matchFactory = !factoryId || r.factory_id === factoryId;
    const isTechnician = r.user_role === 'TECHNICIAN' || r.user_role === 'OPERATOR';
    return matchFactory && isTechnician;
  });

  if (date) {
    records = records.filter(r => r.attendance_date === date);
  }
  if (status) {
    records = records.filter(r => r.status === status);
  }
  if (employee) {
    const q = String(employee).toLowerCase();
    records = records.filter(r => r.user_name.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q));
  }

  records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || b.check_in_time.localeCompare(a.check_in_time));

  // Compute team KPIs
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = db.attendanceRecords.filter(r =>
    r.attendance_date === today &&
    (!factoryId || r.factory_id === factoryId) &&
    (r.user_role === 'TECHNICIAN' || r.user_role === 'OPERATOR')
  );
  const totalTeamTechnicians = db.users.filter(u =>
    (!factoryId || u.factory_id === factoryId) &&
    (u.role === 'TECHNICIAN' || u.role === 'OPERATOR')
  ).length || 5;

  const presentToday = todayRecords.filter(r => r.status === 'Present').length;
  const absentToday = todayRecords.filter(r => r.status === 'Absent').length;

  res.json({
    records,
    kpis: {
      totalTeamTechnicians,
      presentToday,
      absentToday,
      attendanceRatePct: totalTeamTechnicians > 0 ? Math.round((presentToday / totalTeamTechnicians) * 100) : 0
    }
  });
});

// 8. Admin Manual Exception Correction (Audited)
app.post('/api/attendance/manual-exception', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const { user_id, attendance_date, status, reason, notes } = req.body || {};

  if (!user_id || !attendance_date || !status) {
    res.status(400).json({ error: 'user_id, attendance_date, and status are required.' });
    return;
  }

  const targetUser = db.users.find(u => u.id === user_id);
  if (!targetUser) {
    res.status(404).json({ error: 'Employee not found.' });
    return;
  }

  const existingIdx = db.attendanceRecords.findIndex(r => r.user_id === user_id && r.attendance_date === attendance_date);
  const now = new Date();

  let record: AttendanceRecord;
  if (existingIdx >= 0) {
    record = db.attendanceRecords[existingIdx];
    record.status = status;
    record.verification_method = 'MANUAL_AUDITED_EXCEPTION';
    record.verification_notes = `Admin Correction by ${req.user!.name}: ${reason} - ${notes || ''}`;
    if (status === 'Absent') {
      record.absence_reason = reason as any;
      record.absence_notes = notes;
    }
  } else {
    record = {
      id: `ATT-${user_id}-${attendance_date}`,
      user_id: targetUser.id,
      user_name: targetUser.name,
      user_email: targetUser.email,
      user_role: targetUser.role,
      factory_id: targetUser.factory_id || 'FAC-001',
      attendance_date,
      timestamp: now.toISOString(),
      status,
      check_in_time: status === 'Present' ? '08:00:00' : '00:00:00',
      latitude: null,
      longitude: null,
      distance_meters: null,
      is_verified: true,
      verification_method: 'MANUAL_AUDITED_EXCEPTION',
      verification_notes: `Manual Exception by ${req.user!.name}: ${reason} - ${notes || ''}`,
      absence_reason: status === 'Absent' ? (reason as any) : undefined,
      absence_notes: notes,
      created_at: now.toISOString()
    };
    db.attendanceRecords.push(record);
  }

  db.attendanceAuditLogs.push({
    id: `LOG-${Date.now()}`,
    attendance_id: record.id,
    action: 'MANUAL_CORRECTION',
    performed_by_id: req.user!.id,
    performed_by_name: req.user!.name,
    performed_by_role: req.user!.role,
    details: `Manual attendance exception set to ${status} for ${targetUser.name} on ${attendance_date}. Reason: ${reason}`,
    timestamp: now.toISOString()
  });

  res.json({
    success: true,
    message: 'Manual attendance exception recorded and audited.',
    record
  });
});

// ==========================================
// SUPER ADMIN ROUTES
// ==========================================

// Super Admin Overview of all 5 factories
app.get('/api/super-admin/overview', authenticate, authorizeRole('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const overview = await supabaseAdapter.getSuperAdminOverview();
  res.json(overview);
});

// ==========================================
// FACTORIES ROUTES
// ==========================================

// List factories
app.get('/api/factories', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user!.role === 'SUPER_ADMIN') {
    // Super Admin gets all factories with their calculated KPIs
    const overview = await supabaseAdapter.getSuperAdminOverview();
    res.json(overview.factories);
    return;
  }

  // Factory Owner or Manager gets ONLY their own factory
  const factories = await supabaseAdapter.getFactories();
  const userFactory = factories.find(f => f.id === req.user!.factory_id);
  if (!userFactory) {
    res.status(404).json({ error: 'Assigned factory not found' });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(userFactory.id);
  res.json([{
    ...userFactory,
    machine_count: kpis.total_machines,
    running_count: kpis.running_machines,
    oee: kpis.oee,
    active_incidents: kpis.active_incidents,
    open_work_orders: kpis.open_work_orders,
    kpis
  }]);
});

// Get specific factory
app.get('/api/factories/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.params.id;

  // Strict isolation check
  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.factory_id !== factoryId) {
    res.status(403).json({
      error: `Forbidden: You do not have permission to access factory ${factoryId}`
    });
    return;
  }

  const factory = await supabaseAdapter.getFactoryById(factoryId);
  if (!factory) {
    res.status(404).json({ error: 'Factory not found' });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(factory.id);
  res.json({
    ...factory,
    machine_count: kpis.total_machines,
    running_count: kpis.running_machines,
    oee: kpis.oee,
    active_incidents: kpis.active_incidents,
    open_work_orders: kpis.open_work_orders,
    kpis
  });
});

// Get factory dynamic KPIs
app.get('/api/factories/:id/stats', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.params.id;

  // Strict isolation check
  if (req.user!.role !== 'SUPER_ADMIN' && req.user!.factory_id !== factoryId) {
    res.status(403).json({
      error: `Forbidden: Access to factory ${factoryId} data is denied`
    });
    return;
  }

  const kpis = await supabaseAdapter.calculateFactoryKPIs(factoryId);
  res.json(kpis);
});

// ==========================================
// Supabase Status Health Check Endpoint
app.get('/api/supabase/status', async (_req: Request, res: Response): Promise<void> => {
  const status = await testSupabaseConnection();
  res.json(status);
});

// ==========================================
// OPERATIONAL ROUTES (MACHINES, PRODUCTION, ETC.)
// ==========================================

// Machines
app.get('/api/machines', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const machines = await supabaseAdapter.getMachines(lineId);
    res.json(machines);
  } catch (err: any) {
    console.error('[API /api/machines] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'machines',
      isSupabaseUnavailable: true
    });
  }
});

app.get('/api/machines/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machine = await supabaseAdapter.getMachineById(req.params.id);
    if (!machine) {
      res.status(404).json({ error: `Machine ${req.params.id} not found` });
      return;
    }
    res.json(machine);
  } catch (err: any) {
    console.error(`[API /api/machines/${req.params.id}] Error:`, err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'machines',
      isSupabaseUnavailable: true
    });
  }
});

// Create Machine (Admin, Super Admin, Manager / Supervisor only)
app.post('/api/machines', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const machineData = req.body;
    if (!machineData.machine_name && !machineData.name) {
      res.status(400).json({ error: 'Machine name is required' });
      return;
    }
    const factoryId = req.user?.factory_id || machineData.factory_id || 'FAC-001';
    const { machine, syncedToSupabase, supabaseError } = await supabaseAdapter.createMachine(machineData, factoryId);
    res.status(201).json({
      ...machine,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    console.error('[API POST /api/machines] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create machine' });
  }
});

// Update Machine (Admin, Super Admin, Manager / Supervisor only)
app.put('/api/machines/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { machine, syncedToSupabase, supabaseError } = await supabaseAdapter.updateMachine(req.params.id, req.body);
    if (!machine) {
      res.status(404).json({ error: `Machine ${req.params.id} not found` });
      return;
    }
    res.json({
      ...machine,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    console.error(`[API PUT /api/machines/${req.params.id}] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to update machine' });
  }
});

// Quick update machine status (Admin, Super Admin, Manager / Supervisor, Technician)
app.patch('/api/machines/:id/status', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }
    const { machine, syncedToSupabase, supabaseError } = await supabaseAdapter.updateMachine(req.params.id, { status });
    if (!machine) {
      res.status(404).json({ error: `Machine ${req.params.id} not found` });
      return;
    }
    res.json({
      ...machine,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    console.error(`[API PATCH /api/machines/${req.params.id}/status] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to update machine status' });
  }
});

// Delete Machine (Admin, Super Admin only)
app.delete('/api/machines/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteMachine(req.params.id);
    res.json({ success, machine_id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    console.error(`[API DELETE /api/machines/${req.params.id}] Error:`, err.message);
    res.status(500).json({ error: err.message || 'Failed to delete machine' });
  }
});

// Production records with server-side pagination, shift, and search
app.get('/api/production', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  const shift = req.query.shift as string;
  const search = (req.query.search as string || '').trim().toLowerCase();
  const pageParam = req.query.page as string;
  const limitParam = req.query.limit as string;

  try {
    let records = await supabaseAdapter.getProduction(lineId);

    if (shift && shift !== 'All') {
      records = records.filter(r => r.shift === shift);
    }

    if (search) {
      records = records.filter(r =>
        (r.machine_id && r.machine_id.toLowerCase().includes(search)) ||
        (r.product_name && r.product_name.toLowerCase().includes(search)) ||
        (r.operator && r.operator.toLowerCase().includes(search)) ||
        (r.line_id && r.line_id.toLowerCase().includes(search))
      );
    }

    const total = records.length;

    // If page or limit is specified, return paginated object
    if (pageParam || limitParam) {
      const limit = limitParam === 'all' ? total : Math.max(1, parseInt(limitParam || '10', 10));
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const totalPages = Math.ceil(total / limit) || 1;
      const currentPage = Math.min(page, totalPages);
      const startIndex = (currentPage - 1) * limit;
      const paginatedRecords = records.slice(startIndex, startIndex + limit);

      res.json({
        records: paginatedRecords,
        total,
        page: currentPage,
        limit,
        totalPages
      });
      return;
    }

    res.json(records);
  } catch (err: any) {
    console.error('[API /api/production] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'production_records',
      isSupabaseUnavailable: true
    });
  }
});

// Create/Log Production Run (Admin, Super Admin, Manager, Production Planner)
app.post('/api/production', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'PRODUCTION_PLANNER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = req.user?.factory_id || req.body.factory_id || 'FAC-001';
    const { record, syncedToSupabase, supabaseError } = await supabaseAdapter.createProduction(req.body, factoryId);
    res.status(201).json({
      ...record,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    console.error('[API POST /api/production] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create production record' });
  }
});

// Delete Production Record (Admin, Super Admin only)
app.delete('/api/production/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteProduction(req.params.id);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Maintenance records
app.get('/api/maintenance', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const records = await supabaseAdapter.getMaintenance(lineId);
    res.json(records);
  } catch (err: any) {
    console.error('[API /api/maintenance] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'maintenance_records',
      isSupabaseUnavailable: true
    });
  }
});

// Create/Log Maintenance Activity (Admin, Super Admin, Manager, Technician)
app.post('/api/maintenance', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = req.user?.factory_id || req.body.factory_id || 'FAC-001';
    const { record, syncedToSupabase, supabaseError } = await supabaseAdapter.createMaintenance(req.body, factoryId);
    res.status(201).json({
      ...record,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    console.error('[API POST /api/maintenance] Error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to create maintenance record' });
  }
});

// Delete Maintenance Record (Admin, Super Admin only)
app.delete('/api/maintenance/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteMaintenance(req.params.id);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Incidents
app.get('/api/incidents', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const incidents = await supabaseAdapter.getIncidents(lineId);
    res.json(incidents);
  } catch (err: any) {
    console.error('[API /api/incidents] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'incidents',
      isSupabaseUnavailable: true
    });
  }
});

app.post('/api/incidents', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { machine_id, title, description, severity, factory_id } = req.body;
  try {
    const fId = req.user?.factory_id || factory_id || 'FAC-001';
    const incidentPayload = {
      incident_id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      factory_id: fId,
      machine_id: machine_id || 'M001',
      title: title || 'Operational Anomaly',
      problem_description: description || title || '',
      severity: severity || 'Medium',
      status: 'Open',
      reported_by: req.user!.name,
      reported_at: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      shift: 'A',
      downtime_minutes: 0,
      defect_units: 0
    };

    const { incident, syncedToSupabase, supabaseError } = await supabaseAdapter.createIncident(incidentPayload, fId);
    res.status(201).json({
      ...incident,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Incident (Admin, Super Admin, Manager, Technician)
app.patch('/api/incidents/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, severity, title, downtime_minutes } = req.body;
    const { incident, syncedToSupabase, supabaseError } = await supabaseAdapter.updateIncident(req.params.id, {
      status,
      severity,
      title,
      downtime_minutes
    });
    if (!incident) {
      res.status(404).json({ error: `Incident ${req.params.id} not found` });
      return;
    }
    res.json({
      ...incident,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Incident (Admin, Super Admin only)
app.delete('/api/incidents/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteIncident(req.params.id);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Work Orders
app.get('/api/work-orders', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    const workOrders = await supabaseAdapter.getWorkOrders(lineId);
    res.json(workOrders);
  } catch (err: any) {
    console.error('[API /api/work-orders] Error:', err.message);
    res.status(503).json({
      error: err.message,
      code: err.code || 'DATABASE_UNAVAILABLE',
      table: 'work_orders',
      isSupabaseUnavailable: true
    });
  }
});

app.post('/api/work-orders', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { machine_id, title, priority, assigned_to, due_date, estimated_hours, parts_required, factory_id } = req.body;
  try {
    const fId = req.user?.factory_id || factory_id || 'FAC-001';
    const newWorkOrder = {
      work_order_id: `WO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      factory_id: fId,
      machine_id: machine_id || 'M001',
      title: title || 'Maintenance Task',
      priority: priority || 'Medium',
      status: 'Pending',
      assigned_to: assigned_to || req.user!.name || 'Assigned Technician',
      due_date: due_date || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      estimated_hours: Number(estimated_hours) || 2,
      parts_required: parts_required || '',
      labor_hours: Number(estimated_hours) || 2,
      work_order_type: 'Corrective'
    };

    const { workOrder, syncedToSupabase, supabaseError } = await supabaseAdapter.createWorkOrder(newWorkOrder, fId);
    res.status(201).json({
      ...workOrder,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/work-orders/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, assigned_to, actual_hours, priority } = req.body;
    const updates: Partial<WorkOrder> = {};
    if (status) updates.status = status;
    if (assigned_to) updates.assigned_to = assigned_to;
    if (actual_hours !== undefined) updates.actual_hours = Number(actual_hours);
    if (priority) updates.priority = priority;
    if (status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { workOrder, syncedToSupabase, supabaseError } = await supabaseAdapter.updateWorkOrder(req.params.id, updates);
    if (!workOrder) {
      res.status(404).json({ error: `Work order ${req.params.id} not found` });
      return;
    }
    res.json({
      ...workOrder,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Work Order (Admin, Super Admin, Manager / Supervisor)
app.delete('/api/work-orders/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteWorkOrder(req.params.id);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SOPs
app.get('/api/sops', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const resolvedFactoryId = getResolvedFactoryId(req);

  if (resolvedFactoryId === '__FORBIDDEN__') {
    res.status(403).json({ error: 'Forbidden: Cannot access SOPs for another factory' });
    return;
  }

  const factoryId = resolvedFactoryId || 'FAC-001';
  const sops = await supabaseAdapter.getSOPs(factoryId);
  res.json(sops);
});

// Data Quality
app.get('/api/data-quality', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const resolvedFactoryId = getResolvedFactoryId(req);

  if (resolvedFactoryId === '__FORBIDDEN__') {
    res.status(403).json({ error: 'Forbidden: Cannot access data quality for another factory' });
    return;
  }

  const factoryId = resolvedFactoryId || 'FAC-001';
  const dq = await supabaseAdapter.getDataQuality(factoryId);
  res.json(dq);
});

// Users Management
app.get('/api/users', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const factoryId = req.user!.role === 'SUPER_ADMIN' ? null : req.user!.factory_id;
  const users = await supabaseAdapter.getUsers(factoryId);
  res.json(users);
});

// Create Employee/User (Admin, Super Admin only)
app.post('/api/users', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, role, factory_id } = req.body;
    if (!name || !email || !role) {
      res.status(400).json({ error: 'Name, email, and role are required' });
      return;
    }
    const fId = req.user!.role === 'SUPER_ADMIN' ? (factory_id || 'FAC-001') : req.user!.factory_id || 'FAC-001';
    const { user, syncedToSupabase, supabaseError } = await supabaseAdapter.createUser({
      name,
      email,
      role,
      factory_id: fId
    });
    res.status(201).json({
      ...user,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete/Deactivate Employee/User (Admin, Super Admin only)
app.delete('/api/users/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteUser(req.params.id);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Sync entire database to Supabase (Admin, Super Admin only)
app.post('/api/supabase/sync', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await supabaseAdapter.syncAllToSupabase();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notifications Management
app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = getResolvedFactoryId(req);
    const targetFactoryId = factoryId === '__FORBIDDEN__' || !factoryId ? undefined : factoryId;
    const [incidents, workOrders, machines] = await Promise.all([
      supabaseAdapter.getIncidents(targetFactoryId),
      supabaseAdapter.getWorkOrders(targetFactoryId),
      supabaseAdapter.getMachines(targetFactoryId)
    ]);

    const notifications: any[] = [];

    // 1. Incidents
    incidents.forEach(inc => {
      if (inc.status !== 'Closed') {
        const id = `inc-${inc.id || inc.incident_id}`;
        notifications.push({
          id,
          type: 'incident',
          title: `${inc.severity} Incident: ${inc.incident_id}`,
          description: `${inc.title} - ${inc.description || 'Equipment anomaly'}`,
          timestamp: inc.reported_at ? new Date(inc.reported_at).toLocaleString() : 'Recent shift',
          severity: inc.severity || 'High',
          targetPath: '/incidents',
          read: db.readNotificationIds.has(id),
          meta: `Machine: ${inc.machine_id} • Status: ${inc.status}`
        });
      }
    });

    // 2. Work Orders
    workOrders.forEach(wo => {
      if (wo.status === 'Pending Parts' || wo.status === 'In Progress' || wo.priority === 'Critical' || wo.priority === 'High') {
        const id = `wo-${wo.id || wo.work_order_id}`;
        notifications.push({
          id,
          type: 'work_order',
          title: `Work Order: ${wo.work_order_id}`,
          description: `${wo.title} (${wo.priority} Priority)`,
          timestamp: wo.created_at ? new Date(wo.created_at).toLocaleString() : 'Active order',
          severity: wo.priority || 'Medium',
          targetPath: '/work-orders',
          read: db.readNotificationIds.has(id),
          meta: `Assigned: ${wo.assigned_to || 'Unassigned'} • Due: ${wo.due_date || 'ASAP'}`
        });
      }
    });

    // 3. Warning Machines
    machines.forEach(m => {
      if (m.status === 'warning') {
        const id = `mach-${m.id || m.machine_id}`;
        notifications.push({
          id,
          type: 'machine',
          title: `Telemetry Alert: ${m.machine_id}`,
          description: `${m.name} operating at elevated telemetry (${m.temperature_c}°C / ${m.vibration_mms} mm/s)`,
          timestamp: 'Live reading',
          severity: 'High',
          targetPath: '/machines',
          read: db.readNotificationIds.has(id),
          meta: `Line: ${m.line} • Health: ${m.health_score}%`
        });
      }
    });

    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({
      notifications,
      unreadCount,
      readIds: Array.from(db.readNotificationIds)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/mark-read', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { id, ids } = req.body || {};
  if (id && typeof id === 'string') {
    db.readNotificationIds.add(id);
  }
  if (Array.isArray(ids)) {
    ids.forEach(item => {
      if (typeof item === 'string') db.readNotificationIds.add(item);
    });
  }
  res.json({
    success: true,
    readIds: Array.from(db.readNotificationIds)
  });
});

app.post('/api/notifications/mark-all-read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { ids } = req.body || {};
    if (Array.isArray(ids) && ids.length > 0) {
      ids.forEach(id => db.readNotificationIds.add(id));
    } else {
      // Fetch all current notifications and mark them read
      const [incidents, workOrders, machines] = await Promise.all([
        supabaseAdapter.getIncidents(),
        supabaseAdapter.getWorkOrders(),
        supabaseAdapter.getMachines()
      ]);
      incidents.forEach(i => db.readNotificationIds.add(`inc-${i.id || i.incident_id}`));
      workOrders.forEach(w => db.readNotificationIds.add(`wo-${w.id || w.work_order_id}`));
      machines.forEach(m => db.readNotificationIds.add(`mach-${m.id || m.machine_id}`));
    }
    res.json({
      success: true,
      unreadCount: 0,
      readIds: Array.from(db.readNotificationIds)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SYSTEM & SUPABASE STATUS ROUTES
// ==========================================
app.get(['/api/system/status', '/api/supabase/status'], (req: Request, res: Response): void => {
  const status = getDetailedSystemStatus();
  res.json({
    ...status,
    ai: {
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== ''),
      model: 'gemini-3.8-flash'
    }
  });
});

app.get(['/api/ai/status', '/api/ai/status/'], (req: Request, res: Response): void => {
  const configured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    configured,
    model: 'gemini-3.8-flash',
    provider: 'Google GenAI SDK (@google/genai)',
    status: configured ? 'ready' : 'unconfigured',
    message: configured
      ? 'Gemini 3.8 Flash is ready for live operational queries.'
      : 'GEMINI_API_KEY is missing from environment. Set GEMINI_API_KEY in .env to activate live generative AI responses.'
  });
});

// Lightweight in-memory cache for plant telemetry to prevent redundant database queries
interface TelemetrySnapshot {
  timestamp: number;
  machines: any[];
  incidents: any[];
  workOrders: any[];
  sops: any[];
}
let cachedTelemetry: TelemetrySnapshot | null = null;
const TELEMETRY_CACHE_TTL_MS = 15_000; // 15s cache

async function getLiveTelemetrySnapshot(): Promise<TelemetrySnapshot> {
  const now = Date.now();
  if (cachedTelemetry && (now - cachedTelemetry.timestamp < TELEMETRY_CACHE_TTL_MS)) {
    return cachedTelemetry;
  }
  const [machines, incidents, workOrders, sops] = await Promise.all([
    supabaseAdapter.getMachines().catch(() => []),
    supabaseAdapter.getIncidents().catch(() => []),
    supabaseAdapter.getWorkOrders().catch(() => []),
    supabaseAdapter.getSOPs().catch(() => [])
  ]);
  cachedTelemetry = {
    timestamp: now,
    machines,
    incidents,
    workOrders,
    sops
  };
  return cachedTelemetry;
}

// Regex matching common conversational greetings
const GREETING_REGEX = /^(hi|hello|hey|good\s*(morning|afternoon|evening|day)|greetings|howdy|sup|yo|hi\s+there|hello\s+there)[!.,\s]*$/i;

// ==========================================
// AI CHATBOT & OPERATIONS COPILOT (GEMINI API)
// ==========================================
app.post('/api/ai/chat', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { message, history } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  const trimmedMessage = message.trim();

  // Fast-Path for simple greetings: Instant response without DB queries or LLM latency
  if (GREETING_REGEX.test(trimmedMessage)) {
    const firstName = req.user?.name ? req.user.name.split(' ')[0] : 'there';
    res.json({
      success: true,
      reply: `Hello ${firstName}! I am your FactoryOps Operations & Maintenance Copilot. How can I assist you with machine telemetry, OEE analysis, downtime troubleshooting, or work orders today?`,
      model: 'instant-greeting',
      isLiveAi: false,
      isFastPath: true,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Strict check: No silent mock fallback as AI
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
    res.status(400).json({
      success: false,
      configured: false,
      isLiveAi: false,
      error: 'GEMINI_API_KEY is not configured in the server environment. Please set GEMINI_API_KEY in your .env file to enable live AI analysis.'
    });
    return;
  }

  try {
    const isSuperAdmin = req.user?.role === 'SUPER_ADMIN';
    const userFactoryId = req.user?.factory_id || 'FAC-001';

    let operationalContext = '';

    if (isSuperAdmin) {
      // Super Admin: Dynamic Multi-Plant Global Operational Context across all 5 factories
      const factories = db.factories;
      const allMachines = db.machines;
      const allIncidents = db.incidents;
      const allWorkOrders = db.workOrders;

      const runningCount = allMachines.filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'running' || s === 'active';
      }).length;
      const warningCount = allMachines.filter(m => String(m.status || '').toLowerCase() === 'warning').length;
      const maintCount = allMachines.filter(m => String(m.status || '').toLowerCase() === 'maintenance').length;
      const offlineCount = allMachines.filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'offline' || s === 'inactive';
      }).length;

      const criticalIncidents = allIncidents.filter(i => i.severity === 'Critical' && i.status !== 'Closed');
      const highIncidents = allIncidents.filter(i => i.severity === 'High' && i.status !== 'Closed');
      const openWorkOrders = allWorkOrders.filter(w => w.status !== 'Completed');

      // Compute live fleet OEE average
      const avgOee = allMachines.length > 0
        ? Math.round(allMachines.reduce((acc, m) => acc + (Number(m.oee) || 85), 0) / allMachines.length * 10) / 10
        : 88.5;

      operationalContext = `
FactoryOps Multi-Plant Enterprise Intelligence (Super Admin Global Scope):
- Authenticated User: ${req.user?.name || 'Super Admin'} (Role: SUPER_ADMIN)
- Total Managed Facilities: ${factories.length} industrial plants
${factories.map(f => `  • ${f.name} [${f.factory_code}] (${f.location}) - Sector: ${f.industry}, Capacity: ${f.capacity}, Status: ${f.status}`).join('\n')}
- Connected Enterprise Fleet: ${allMachines.length} total machinery assets across plants
  - Running/Active: ${runningCount}
  - Warning/Degraded: ${warningCount}
  - In Maintenance: ${maintCount}
  - Offline: ${offlineCount}
  - Enterprise Fleet Average OEE: ${avgOee}%
- Active Critical Incidents (${criticalIncidents.length}):
${criticalIncidents.slice(0, 6).map(i => `  • [${i.factory_id}] ${i.incident_id} on ${i.machine_id}: ${i.title} (${i.severity}) - Root Cause: ${i.failure_category || 'Mechanical'}`).join('\n') || '  • No critical incidents active across plants'}
- Active High-Priority Incidents (${highIncidents.length}):
${highIncidents.slice(0, 5).map(i => `  • [${i.factory_id}] ${i.incident_id} on ${i.machine_id}: ${i.title} (${i.severity})`).join('\n') || '  • None'}
- Pending Work Orders (${openWorkOrders.length} total across plants):
${openWorkOrders.slice(0, 6).map(w => `  • [${w.factory_id}] ${w.work_order_id} [${w.priority}]: ${w.title} assigned to ${w.assigned_to} (Due: ${w.due_date})`).join('\n')}
- Key Focus: Cross-plant reliability benchmarking, multi-factory equipment bottleneck analysis, preventative maintenance scheduling, and corporate OEE optimization.
`;
    } else {
      // Factory-Scoped Context for Plant Admin, Manager, Technician, Planner
      const factory = db.factories.find(f => f.id === userFactoryId) || db.factories[0];
      const factoryMachines = db.machines.filter(m => !m.factory_id || m.factory_id === userFactoryId);
      const factoryIncidents = db.incidents.filter(i => !i.factory_id || i.factory_id === userFactoryId);
      const factoryWorkOrders = db.workOrders.filter(w => !w.factory_id || w.factory_id === userFactoryId);
      const sops = db.sops.filter(s => !s.factory_id || s.factory_id === userFactoryId);

      const runningCount = factoryMachines.filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'running' || s === 'active';
      }).length;
      const warningCount = factoryMachines.filter(m => String(m.status || '').toLowerCase() === 'warning').length;
      const maintCount = factoryMachines.filter(m => String(m.status || '').toLowerCase() === 'maintenance').length;
      const offlineCount = factoryMachines.filter(m => {
        const s = String(m.status || '').toLowerCase();
        return s === 'offline' || s === 'inactive';
      }).length;

      const criticalIncidents = factoryIncidents.filter(i => i.severity === 'Critical');
      const openIncidents = factoryIncidents.filter(i => i.status !== 'Closed');
      const openWorkOrders = factoryWorkOrders.filter(w => w.status !== 'Completed');

      const plantOee = factoryMachines.length > 0
        ? Math.round(factoryMachines.reduce((acc, m) => acc + (Number(m.oee) || 85), 0) / factoryMachines.length * 10) / 10
        : 88.0;

      operationalContext = `
FactoryOps Local Plant Operational Snapshot:
- Plant: ${factory.name} [${factory.factory_code}] - ${factory.location}
- Industry: ${factory.industry}
- Authenticated User: ${req.user?.name || 'Operator'} (${req.user?.role || 'Staff'})
- Connected Plant Fleet: ${factoryMachines.length} machines
  - Running/Active: ${runningCount}
  - Warning/Degraded: ${warningCount}
  - In Maintenance: ${maintCount}
  - Offline: ${offlineCount}
  - Plant Average OEE: ${plantOee}%
- Connected Equipment Highlights:
${factoryMachines.slice(0, 10).map(m => `  • ${m.machine_id} (${m.name}, Line: ${m.line}, Status: ${m.status}, Health: ${m.health_score}%, OEE: ${m.oee}%)`).join('\n')}
- Incidents: ${factoryIncidents.length} total logged (${openIncidents.length} open, ${criticalIncidents.length} critical).
${openIncidents.slice(0, 5).map(i => `  • ${i.incident_id} on ${i.machine_id}: ${i.title} (${i.severity}, Status: ${i.status})`).join('\n')}
- Active Work Orders (${openWorkOrders.length} pending):
${openWorkOrders.slice(0, 5).map(w => `  • ${w.work_order_id} [${w.priority}]: ${w.title} assigned to ${w.assigned_to} (Due: ${w.due_date})`).join('\n')}
- Standard Operating Procedures: ${sops.slice(0, 4).map(s => `${s.id}: ${s.title}`).join(', ')}
`;
    }

    const ai = new GoogleGenAI();
    const systemInstruction = `You are the FactoryOps AI Operations & Maintenance Copilot, an industrial artificial intelligence assistant embedded into the FactoryOps platform.
You assist industrial professionals (Super Admin, Plant Owners, Shift Supervisors, Reliability Engineers, Technicians, and Production Planners).

Your capabilities:
1. Equipment telemetry analysis, predictive maintenance alerts, and vibration/temperature threshold interpretation.
2. Troubleshooting machine stoppages, root cause triage (5 Whys, Ishikawa), and downtime reduction.
3. Scheduling work orders, prioritizing critical repairs, and assigning maintenance staff.
4. Standard Operating Procedures (SOPs) step-by-step guidance.
5. Production targets, OEE optimization (Availability, Performance, Quality), and scrap reduction.
6. When the user is Super Admin, provide high-level cross-factory comparative intelligence and plant benchmarking across all facilities.

Rules:
- Be concise, direct, and actionable. Use bullet points or numbered steps where appropriate.
- Ground all your recommendations in the live operational snapshot provided below.
- When referencing specific machines or work orders, use their exact IDs and names from the live context.
- Format all numeric values cleanly (e.g., round downtime to 1 decimal place, percentages to 1 or 2 decimals).
- Maintain an authoritative, professional industrial engineering tone.

${operationalContext}`;

    // Convert conversation history if present
    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-8).forEach(h => {
        if (h.role && h.text) {
          contents.push({
            role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
            parts: [{ text: h.text }]
          });
        }
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: trimmedMessage }]
    });

    const timeoutMs = 25000;
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API call timed out after 25s. Please check network connectivity or retry.')), timeoutMs)
    );

    const response: any = await Promise.race([aiPromise, timeoutPromise]);

    const replyText = response.text || 'Operational analysis complete. No anomalous telemetry detected.';
    res.json({
      success: true,
      reply: replyText,
      model: 'gemini-3.8-flash',
      isLiveAi: true,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('[API /api/ai/chat] Error:', err);
    res.status(502).json({
      success: false,
      isLiveAi: false,
      configured: true,
      error: `Gemini API query error: ${err.message || 'Service unreachable'}. Verify your GEMINI_API_KEY and network connection.`
    });
  }
});

// ==========================================
// SPARE PARTS INVENTORY ROUTES
// ==========================================

app.get('/api/inventory', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = getResolvedFactoryId(req) || req.user?.factory_id || 'FAC-001';
    const parts = await supabaseAdapter.getSpareParts(factoryId);
    res.json(parts);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch inventory' });
  }
});

app.post('/api/inventory', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = req.user?.factory_id || req.body.factory_id || 'FAC-001';
    const { part, syncedToSupabase, supabaseError } = await supabaseAdapter.createSparePart(req.body, factoryId);
    await logAuditEvent(req, 'CREATE_SPARE_PART', 'SparePart', part.id, `Added spare part ${part.name} (${part.part_number}) with stock ${part.stock_quantity}`);
    res.status(201).json({
      ...part,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create spare part' });
  }
});

app.put('/api/inventory/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { part, syncedToSupabase, supabaseError } = await supabaseAdapter.updateSparePart(req.params.id, req.body);
    if (!part) {
      res.status(404).json({ error: `Spare part ${req.params.id} not found` });
      return;
    }
    await logAuditEvent(req, 'UPDATE_SPARE_PART', 'SparePart', part.id, `Updated spare part ${part.name}: stock level now ${part.stock_quantity}`);
    res.json({
      ...part,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update spare part' });
  }
});

app.delete('/api/inventory/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { success, syncedToSupabase, supabaseError } = await supabaseAdapter.deleteSparePart(req.params.id);
    await logAuditEvent(req, 'DELETE_SPARE_PART', 'SparePart', req.params.id, `Deleted spare part ${req.params.id}`);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete spare part' });
  }
});

// ==========================================
// SYSTEM AUDIT LOGS ROUTE
// ==========================================

app.get('/api/audit-logs', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await supabaseAdapter.getSystemAuditLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
  }
});

// ==========================================
// MACHINE THRESHOLDS ROUTE
// ==========================================

app.post('/api/machines/thresholds', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { machine_id, max_temperature_c, max_vibration_mms } = req.body;
    if (!machine_id) {
      res.status(400).json({ error: 'machine_id is required' });
      return;
    }
    const machine = db.machines.find(m => m.id === machine_id || m.machine_id === machine_id);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found' });
      return;
    }
    if (max_temperature_c !== undefined) (machine as any).max_temperature_c = Number(max_temperature_c);
    if (max_vibration_mms !== undefined) (machine as any).max_vibration_mms = Number(max_vibration_mms);
    db.persist();

    await logAuditEvent(req, 'UPDATE_THRESHOLDS', 'Machine', machine.id, `Configured alert thresholds for machine ${machine.name}: Temp max ${max_temperature_c}°C, Vibration max ${max_vibration_mms}mm/s`);
    res.json({ success: true, machine });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to set machine thresholds' });
  }
});

// API 404 Fallback - Ensures unhandled API routes return JSON and NEVER fall through to HTML/Vite
app.all('/api/*', (req: Request, res: Response): void => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// Global API Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (req.path.startsWith('/api')) {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
    return;
  }
  next(err);
});

// ==========================================
// VITE DEV SERVER / STATIC ASSETS
// ==========================================
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('[FactoryOps] Error loading Vite development middleware:', err);
    }
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const indexPath = path.resolve(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response): void => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>FactoryOps - Smart Factory Operations Platform</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </head>
            <body style="font-family:system-ui,-apple-system,sans-serif;background:#0b132b;color:#e0e6ed;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
              <div style="background:#1c2541;padding:32px;border-radius:12px;border:1px solid #3a506b;max-width:540px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <h1 style="color:#60a5fa;margin-top:0;font-size:22px;">FactoryOps Production Server Active</h1>
                <p style="color:#94a3b8;font-size:14px;line-height:1.6;">The production API backend is online and listening. Building frontend bundles...</p>
                <div style="margin-top:20px;padding:12px;background:#0b132b;border-radius:6px;font-family:monospace;font-size:12px;color:#38bdf8;">
                  Status: <a href="/api/system/status" style="color:#38bdf8;text-decoration:underline;">/api/system/status</a>
                </div>
              </div>
            </body>
          </html>
        `);
      }
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[FactoryOps] Enterprise Server running at http://${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
    testSupabaseConnection().catch(err => {
      console.warn('[Supabase] Initial connection check warning:', err?.message || err);
    });
  });

  server.on('error', (err: any) => {
    console.error(`[FactoryOps] Server failed to start on ${HOST}:${PORT}:`, err);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('[FactoryOps] Shutting down server gracefully...');
    server.close(() => {
      console.log('[FactoryOps] Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
