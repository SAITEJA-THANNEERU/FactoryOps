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
import type {
  User,
  UserRole,
  Incident,
  WorkOrder,
  Machine,
  FactoryLocation,
  AttendanceRecord,
  AttendanceAuditLog,
  TechnicianIncidentAssignment,
  TechnicianProfile,
  RepairProgressUpdate,
  IncidentResolutionSubmission,
  IncidentVerificationDetails,
  AppNotification,
  NotificationPriority,
  NotificationType
} from './src/types/index.ts';
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
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
    return;
  }
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

// Role authorization middleware with centralized audit logging of denied attempts
function authorizeRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      const details = `Access denied to ${req.method} ${req.path}. Required: [${allowedRoles.join(', ')}], actual: '${req.user.role}'`;
      logAuditEvent(req, 'UNAUTHORIZED_ACCESS_ATTEMPT', 'ApiRoute', req.path, details).catch(() => {});
      dispatchNotification({
        recipient_role: 'SUPER_ADMIN',
        title: `Security Event: Unauthorized Access Attempt`,
        message: `User ${req.user.name} (${req.user.role}) attempted unauthorized action on ${req.method} ${req.path}`,
        notification_type: 'SECURITY_EVENT',
        priority: 'CRITICAL',
        related_module: 'Security & Access Control',
        target_path: '/system-health'
      }).catch(() => {});
      res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
      });
      return;
    }
    next();
  };
}

// Helper to determine and enforce factory isolation (Single-Factory: APEX FAC-001)
function getResolvedFactoryId(req: AuthenticatedRequest, requestedFactoryId?: string): string | null {
  if (!req.user) return null;
  // FactoryOps operates strictly in single-factory mode with APEX (FAC-001)
  return 'FAC-001';
}

// Centralized Audit Event Logger Helper
async function logAuditEvent(
  req: AuthenticatedRequest | Request,
  action: string,
  entityType: string,
  entityId: string,
  details: string,
  overrideUser?: { id: string; name: string; role: string; email: string; factory_id?: string | null }
) {
  const u = overrideUser || (req as AuthenticatedRequest).user;
  try {
    await supabaseAdapter.createSystemAuditLog({
      factory_id: u?.factory_id || 'FAC-001',
      user_id: u?.id || 'ANONYMOUS',
      user_name: u?.name || 'Anonymous User',
      user_role: u?.role || 'NONE',
      user_email: u?.email || 'unauthenticated@factoryops.com',
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
    logAuditEvent(req, 'LOGIN_FAILED', 'User', identifier, `Failed login attempt: Account identifier '${identifier}' not found`).catch(() => {});
    res.status(401).json({ success: false, error: 'Invalid email/username or password' });
    return;
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    logAuditEvent(req, 'LOGIN_FAILED', 'User', user.id, `Failed login attempt: Invalid password for user ${user.name} (${user.email})`, user).catch(() => {});
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

  // Log successful login
  logAuditEvent(req, 'LOGIN_SUCCESS', 'User', user.id, `User ${user.name} (${user.role}) authenticated successfully`, user).catch(() => {});

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

  // Log user registration event
  logAuditEvent(req, 'USER_REGISTERED', 'User', newUser.id, `User ${newUser.name} (${newUser.role}) registered an account`, newUser).catch(() => {});

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

// Logout endpoint with session cleanup and audit trail
app.post(['/api/auth/logout', '/api/auth/logout/'], (req: AuthenticatedRequest, res: Response): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = db.sessions.get(token);
    if (session) {
      const user = db.users.find(u => u.id === session.userId);
      if (user) {
        logAuditEvent(req, 'LOGOUT', 'User', user.id, `User ${user.name} logged out`, user).catch(() => {});
      }
      db.sessions.delete(token);
    }
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

// 7. Manager Attendance View (Technicians & Production Planners - Team Attendance)
app.get('/api/attendance/manager', authenticate, authorizeRole('MANAGER_SUPERVISOR', 'ADMIN', 'SUPER_ADMIN'), (req: AuthenticatedRequest, res: Response): void => {
  const factoryId = getResolvedFactoryId(req) || req.user?.factory_id || 'FAC-001';
  const { date, status, employee } = req.query;

  // Team roles: Technicians AND Production Planners
  const allowedRoles = ['TECHNICIAN', 'OPERATOR', 'PRODUCTION_PLANNER'];

  // All team members belonging to this factory
  const teamUsers = db.users.filter(u =>
    (!factoryId || u.factory_id === factoryId) &&
    allowedRoles.includes(u.role)
  );

  let records = db.attendanceRecords.filter(r => {
    const matchFactory = !factoryId || r.factory_id === factoryId;
    const isTeamMember = allowedRoles.includes(r.user_role);
    return matchFactory && isTeamMember;
  });

  if (date) {
    const dateStr = String(date);
    const dateRecords = records.filter(r => r.attendance_date === dateStr);

    // Identify which team employees have not checked in or are absent for this date
    const recordedUserIds = new Set(dateRecords.map(r => r.user_id));
    const missingRecords: AttendanceRecord[] = [];

    teamUsers.forEach(u => {
      if (!recordedUserIds.has(u.id)) {
        missingRecords.push({
          id: `ATT-${u.id}-${dateStr}`,
          user_id: u.id,
          user_name: u.name,
          user_email: u.email,
          user_role: u.role as any,
          factory_id: factoryId,
          attendance_date: dateStr,
          timestamp: new Date().toISOString(),
          status: 'Absent',
          check_in_time: '--',
          latitude: null,
          longitude: null,
          distance_meters: null,
          is_verified: false,
          verification_method: 'MANUAL_AUDITED_EXCEPTION',
          verification_notes: 'Not Checked In / Absent',
          created_at: new Date().toISOString()
        });
      }
    });

    records = [...dateRecords, ...missingRecords];
  }

  if (status && status !== 'ALL') {
    records = records.filter(r => r.status === status);
  }
  if (employee) {
    const q = String(employee).toLowerCase();
    records = records.filter(r => r.user_name.toLowerCase().includes(q) || r.user_email.toLowerCase().includes(q));
  }

  records.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date) || b.check_in_time.localeCompare(a.check_in_time));

  // Compute team KPIs
  const today = new Date().toISOString().split('T')[0];
  const queryDate = date ? String(date) : today;
  const targetDayRecords = records.filter(r => r.attendance_date === queryDate);
  const totalTeamMembers = teamUsers.length || 2;
  const presentToday = targetDayRecords.filter(r => r.status === 'Present').length;
  const absentToday = targetDayRecords.filter(r => r.status === 'Absent').length;

  res.json({
    records,
    kpis: {
      totalTeamTechnicians: totalTeamMembers,
      presentToday,
      absentToday,
      attendanceRatePct: totalTeamMembers > 0 ? Math.round((presentToday / totalTeamMembers) * 100) : 0
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
    await logAuditEvent(req, 'CREATE_MACHINE', 'Machine', machine.id, `Created machine ${machine.name} (${machine.machine_id}) on line ${machine.line}`);
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
    await logAuditEvent(req, 'UPDATE_MACHINE', 'Machine', req.params.id, `Updated specifications for machine ${machine.name}`);
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
    await logAuditEvent(req, 'UPDATE_MACHINE_STATUS', 'Machine', req.params.id, `Changed machine ${machine.name} status to ${status}`);

    if (status === 'offline') {
      dispatchNotification({
        recipient_role: 'SUPER_ADMIN',
        title: `Major Machine Failure: ${machine.name}`,
        message: `${machine.machine_id} on line ${machine.line} changed to OFFLINE status.`,
        notification_type: 'MACHINE_DOWNTIME',
        priority: 'CRITICAL',
        related_module: 'Machines',
        related_record_id: machine.id,
        target_path: '/machines',
        meta: `Status: Offline`
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'ADMIN',
        factory_id: 'FAC-001',
        title: `Critical Machine Failure: ${machine.name} Offline`,
        message: `${machine.name} (${machine.machine_id}) is down. Requires immediate maintenance intervention.`,
        notification_type: 'MACHINE_DOWNTIME',
        priority: 'CRITICAL',
        related_module: 'Machines',
        related_record_id: machine.id,
        target_path: '/machines'
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: 'FAC-001',
        title: `Machine Downtime Alert: ${machine.name}`,
        message: `${machine.name} on line ${machine.line} marked OFFLINE. Review shift allocation.`,
        notification_type: 'MACHINE_DOWNTIME',
        priority: 'HIGH',
        related_module: 'Machines',
        related_record_id: machine.id,
        target_path: '/manager-dashboard'
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        title: `Production Capacity Alert: ${machine.name} Offline`,
        message: `Machine downtime on line ${machine.line} will impact throughput targets. Adjust line scheduling.`,
        notification_type: 'PRODUCTION_SHORTFALL',
        priority: 'HIGH',
        related_module: 'Production',
        related_record_id: machine.id,
        target_path: '/production-planner-dashboard'
      }).catch(() => {});
    } else if (status === 'warning') {
      dispatchNotification({
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: 'FAC-001',
        title: `Machine Warning: ${machine.name}`,
        message: `${machine.name} running in degraded/warning status. Preventative inspection advised.`,
        notification_type: 'MACHINE_STATUS_CHANGE',
        priority: 'MEDIUM',
        related_module: 'Machines',
        related_record_id: machine.id,
        target_path: '/machines'
      }).catch(() => {});
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
    await logAuditEvent(req, 'DELETE_MACHINE', 'Machine', req.params.id, `Decommissioned machine ${req.params.id}`);
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
    await logAuditEvent(req, 'LOG_PRODUCTION', 'ProductionRecord', record.id, `Logged shift ${record.shift} production for machine ${record.machine_id}: ${record.actual_units} units`);
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
    await logAuditEvent(req, 'DELETE_PRODUCTION', 'ProductionRecord', req.params.id, `Deleted production record ${req.params.id}`);
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
    await logAuditEvent(req, 'LOG_MAINTENANCE', 'MaintenanceRecord', record.id, `Logged ${record.type} maintenance on ${record.machine_id} by ${record.technician}`);
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
    await logAuditEvent(req, 'DELETE_MAINTENANCE', 'MaintenanceRecord', req.params.id, `Deleted maintenance record ${req.params.id}`);
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

app.post('/api/incidents', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    await logAuditEvent(req, 'REPORT_INCIDENT', 'Incident', incident.incident_id || incident.id || 'INC', `Reported incident ${incident.incident_id || incident.id}: ${incident.title} on machine ${incident.machine_id}`);

    // Role-based notification triggers
    if (incidentPayload.severity === 'Critical') {
      dispatchNotification({
        recipient_role: 'SUPER_ADMIN',
        title: `Critical Factory Incident: ${incidentPayload.incident_id}`,
        message: `${incidentPayload.title} on machine ${incidentPayload.machine_id}. Immediate operations attention required.`,
        notification_type: 'INCIDENT_CRITICAL',
        priority: 'CRITICAL',
        related_module: 'Incidents',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/incidents',
        meta: `Machine: ${incidentPayload.machine_id} • Severity: Critical`
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'ADMIN',
        factory_id: fId,
        title: `Critical Machine Failure: ${incidentPayload.machine_id}`,
        message: `${incidentPayload.title} reported by ${incidentPayload.reported_by}.`,
        notification_type: 'INCIDENT_CRITICAL',
        priority: 'CRITICAL',
        related_module: 'Incidents',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/incidents',
        meta: `Machine: ${incidentPayload.machine_id}`
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: fId,
        title: `Incident Requiring Attention: ${incidentPayload.incident_id}`,
        message: `${incidentPayload.title} on ${incidentPayload.machine_id}. Assign technician immediately.`,
        notification_type: 'INCIDENT_CRITICAL',
        priority: 'CRITICAL',
        related_module: 'Incidents',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/manager-dashboard',
        meta: `Action: Assign Technician`
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: fId,
        title: `Machine Breakdown Affecting Production`,
        message: `Failure on ${incidentPayload.machine_id}: ${incidentPayload.title}. Monitor production shortfalls.`,
        notification_type: 'MACHINE_DOWNTIME',
        priority: 'HIGH',
        related_module: 'Production',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/production-planner-dashboard',
        meta: `Line impact alert`
      }).catch(() => {});
    } else {
      const priorityLevel: NotificationPriority = incidentPayload.severity === 'High' ? 'HIGH' : 'MEDIUM';
      dispatchNotification({
        recipient_role: 'ADMIN',
        factory_id: fId,
        title: `New Factory Incident: ${incidentPayload.incident_id}`,
        message: `${incidentPayload.title} on machine ${incidentPayload.machine_id} (${incidentPayload.severity})`,
        notification_type: 'INCIDENT_NEW',
        priority: priorityLevel,
        related_module: 'Incidents',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/incidents'
      }).catch(() => {});

      dispatchNotification({
        recipient_role: 'MANAGER_SUPERVISOR',
        factory_id: fId,
        title: `New Incident Requiring Attention: ${incidentPayload.incident_id}`,
        message: `${incidentPayload.title} on ${incidentPayload.machine_id}. Review and assign technician.`,
        notification_type: 'INCIDENT_NEW',
        priority: priorityLevel,
        related_module: 'Incidents',
        related_record_id: incident.incident_id || incident.id,
        target_path: '/manager-dashboard'
      }).catch(() => {});
    }

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
app.patch('/api/incidents/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    await logAuditEvent(req, 'UPDATE_INCIDENT', 'Incident', req.params.id, `Updated incident ${req.params.id} status to ${status || 'updated'}`);
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
    await logAuditEvent(req, 'DELETE_INCIDENT', 'Incident', req.params.id, `Deleted incident ${req.params.id}`);
    res.json({ success, id: req.params.id, syncedToSupabase, supabaseError });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Work Orders (Technician restricted to assigned / unassigned tasks)
app.get('/api/work-orders', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const lineId = req.query.line_id as string;
  try {
    let workOrders = await supabaseAdapter.getWorkOrders(lineId);

    // If Technician, restrict to assigned work orders or unassigned ones
    if (req.user?.role === 'TECHNICIAN') {
      const uName = req.user.name.toLowerCase();
      const uFirst = uName.split(' ')[0];
      workOrders = workOrders.filter(w =>
        !w.assigned_to ||
        w.assigned_to === 'Unassigned' ||
        w.assigned_to === 'Assigned Technician' ||
        w.assigned_to.toLowerCase().includes(uFirst) ||
        w.assigned_to.toLowerCase().includes(req.user!.id.toLowerCase())
      );
    }

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

// Create Work Order (Admin, Super Admin, Manager / Supervisor only)
app.post('/api/work-orders', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    await logAuditEvent(req, 'CREATE_WORK_ORDER', 'WorkOrder', workOrder.work_order_id || workOrder.id || 'WO', `Created work order ${workOrder.work_order_id || workOrder.id}: ${workOrder.title} assigned to ${workOrder.assigned_to}`);

    const woPriority: NotificationPriority = workOrder.priority === 'Critical' ? 'CRITICAL' : workOrder.priority === 'High' ? 'HIGH' : 'MEDIUM';

    dispatchNotification({
      recipient_role: 'ADMIN',
      factory_id: fId,
      title: `New Work Order: ${workOrder.work_order_id}`,
      message: `${workOrder.title} (${workOrder.priority} Priority) assigned to ${workOrder.assigned_to}`,
      notification_type: 'WORK_ORDER_NEW',
      priority: woPriority,
      related_module: 'Work Orders',
      related_record_id: workOrder.work_order_id || workOrder.id,
      target_path: '/work-orders',
      meta: `Machine: ${workOrder.machine_id} • Assigned: ${workOrder.assigned_to}`
    }).catch(() => {});

    dispatchNotification({
      recipient_role: 'MANAGER_SUPERVISOR',
      factory_id: fId,
      title: `New Work Order Created: ${workOrder.work_order_id}`,
      message: `${workOrder.title} for ${workOrder.machine_id}. Due: ${workOrder.due_date}`,
      notification_type: 'WORK_ORDER_NEW',
      priority: woPriority,
      related_module: 'Work Orders',
      related_record_id: workOrder.work_order_id || workOrder.id,
      target_path: '/manager-dashboard'
    }).catch(() => {});

    // If assigned to a technician, notify them
    if (workOrder.assigned_to) {
      const assignedTechUser = db.users.find(u =>
        u.role === 'TECHNICIAN' &&
        (u.name.toLowerCase().includes(workOrder.assigned_to.toLowerCase().split(' ')[0]) ||
         workOrder.assigned_to.toLowerCase().includes(u.name.toLowerCase().split(' ')[0]))
      );
      if (assignedTechUser) {
        dispatchNotification({
          recipient_user_id: assignedTechUser.id,
          recipient_role: 'TECHNICIAN',
          factory_id: fId,
          title: `New Work Assignment: ${workOrder.work_order_id}`,
          message: `${workOrder.title} on ${workOrder.machine_id}. Due by ${workOrder.due_date}.`,
          notification_type: 'WORK_ORDER_NEW',
          priority: woPriority,
          related_module: 'Work Orders',
          related_record_id: workOrder.work_order_id || workOrder.id,
          target_path: '/technician-dashboard',
          meta: `Due: ${workOrder.due_date}`
        }).catch(() => {});
      }
    }

    res.status(201).json({
      ...workOrder,
      syncedToSupabase,
      supabaseError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Work Order (Admin, Super Admin, Manager, Technician for assigned tasks)
app.patch('/api/work-orders/:id', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR', 'TECHNICIAN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, assigned_to, actual_hours, priority } = req.body;

    // Technician validation: can only update their own assigned work orders and cannot mark Completed directly
    if (req.user?.role === 'TECHNICIAN') {
      const currentWO = db.workOrders.find(w => w.id === req.params.id || w.work_order_id === req.params.id);
      if (currentWO) {
        const uFirst = req.user.name.toLowerCase().split(' ')[0];
        const isAssigned =
          !currentWO.assigned_to ||
          currentWO.assigned_to === 'Unassigned' ||
          currentWO.assigned_to.toLowerCase().includes(uFirst) ||
          currentWO.assigned_to.toLowerCase().includes(req.user.id.toLowerCase());
        if (!isAssigned) {
          res.status(403).json({ error: 'Forbidden: You can only update your own assigned work orders' });
          return;
        }
        if (status === 'Completed') {
          res.status(403).json({ error: 'Segregation of Duties: Technicians cannot directly close work orders. Submit for Manager verification.' });
          return;
        }
      }
    }

    const updates: Partial<WorkOrder> = {};
    if (status) updates.status = status;
    if (assigned_to && req.user?.role !== 'TECHNICIAN') updates.assigned_to = assigned_to;
    if (actual_hours !== undefined) updates.actual_hours = Number(actual_hours);
    if (priority && req.user?.role !== 'TECHNICIAN') updates.priority = priority;
    if (status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { workOrder, syncedToSupabase, supabaseError } = await supabaseAdapter.updateWorkOrder(req.params.id, updates);
    if (!workOrder) {
      res.status(404).json({ error: `Work order ${req.params.id} not found` });
      return;
    }
    await logAuditEvent(req, 'UPDATE_WORK_ORDER', 'WorkOrder', req.params.id, `Updated work order ${req.params.id}: status=${status || 'updated'}`);
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
    await logAuditEvent(req, 'DELETE_WORK_ORDER', 'WorkOrder', req.params.id, `Deleted work order ${req.params.id}`);
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

// Data Quality (Admin and Super Admin only)
app.get(['/api/data-quality', '/api/data-quality/'], authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const resolvedFactoryId = getResolvedFactoryId(req);

  if (resolvedFactoryId === '__FORBIDDEN__') {
    res.status(403).json({ error: 'Forbidden: Cannot access data quality for another factory' });
    return;
  }

  const factoryId = resolvedFactoryId || 'FAC-001';
  const dq = await supabaseAdapter.getDataQuality(factoryId);
  res.json(dq);
});

// Users Management (Admin, Super Admin, Manager / Supervisor)
app.get('/api/users', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    await logAuditEvent(req, 'CREATE_USER', 'User', user?.id || name, `Created employee/user ${name} (${role}) in factory ${fId}`);
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
    await logAuditEvent(req, 'DELETE_USER', 'User', req.params.id, `Deleted/deactivated user ${req.params.id}`);
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

// ==========================================
// ROLE-BASED NOTIFICATION & REAL-TIME SSE ENGINE
// ==========================================

interface NotificationClient {
  id: string;
  res: Response;
  userId: string;
  role: UserRole;
  factoryId?: string;
}

const notificationClients = new Map<string, NotificationClient>();

export async function dispatchNotification(data: {
  recipient_user_id?: string | null;
  recipient_role?: UserRole | string;
  factory_id?: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  related_module: string;
  related_record_id?: string;
  target_path: string;
  meta?: string;
}): Promise<AppNotification> {
  const notif = db.createNotification({
    recipient_user_id: data.recipient_user_id || null,
    recipient_role: (data.recipient_role as any) || 'ALL',
    factory_id: data.factory_id || 'FAC-001',
    title: data.title,
    message: data.message,
    notification_type: data.notification_type,
    priority: data.priority,
    related_module: data.related_module,
    related_record_id: data.related_record_id,
    target_path: data.target_path,
    meta: data.meta
  });
  // Asynchronously synchronize to Supabase
  supabaseAdapter.createNotification(notif).catch(e => console.warn('[Supabase notif sync]', e.message));

  // Push to connected SSE clients honoring strict role, user, and factory isolation
  const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION', notification: notif })}\n\n`;

  notificationClients.forEach((client) => {
    // 1. Strict recipient user isolation
    if (notif.recipient_user_id) {
      if (client.userId !== notif.recipient_user_id && client.role !== 'SUPER_ADMIN') {
        return;
      }
    }

    // 2. Role isolation
    if (notif.recipient_role) {
      if (client.role !== notif.recipient_role && client.role !== 'SUPER_ADMIN') {
        return;
      }
    }

    // 3. Factory isolation
    if (notif.factory_id && client.role !== 'SUPER_ADMIN') {
      const clientFactory = client.factoryId || 'FAC-001';
      if (clientFactory !== notif.factory_id) {
        return;
      }
    }

    try {
      client.res.write(payload);
    } catch {
      // Disconnected client will be pruned
    }
  });

  return notif;
}

function broadcastNotificationRead(notificationIds: string[], userId?: string) {
  const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION_READ', ids: notificationIds, userId })}\n\n`;
  notificationClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // ignore
    }
  });
}

// 1. Real-Time SSE Stream for live notification delivery
app.get('/api/notifications/stream', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const factoryId = getResolvedFactoryId(req) || 'FAC-001';
  const clientId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client: NotificationClient = {
    id: clientId,
    res,
    userId: user.id,
    role: user.role,
    factoryId
  };
  notificationClients.set(clientId, client);

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, userId: user.id, role: user.role })}\n\n`);

  // Periodic heartbeat
  const pingInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(pingInterval);
      notificationClients.delete(clientId);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(pingInterval);
    notificationClients.delete(clientId);
  });
});

// 2. Fetch Notifications with strict role-based access control
app.get('/api/notifications', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const factoryId = getResolvedFactoryId(req) || 'FAC-001';
    const filter = (req.query.filter as string) || 'all';

    const notifications = await supabaseAdapter.getNotifications(user.id, user.role, factoryId, filter);
    const unreadCount = notifications.filter(n => !n.is_read).length;

    res.json({
      notifications,
      unreadCount,
      readIds: notifications.filter(n => n.is_read).map(n => n.id)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Mark specific notification(s) as read with authorization verification
app.post('/api/notifications/mark-read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { id, ids } = req.body || {};
    const targetIds: string[] = [];

    if (id && typeof id === 'string') targetIds.push(id);
    if (Array.isArray(ids)) {
      ids.forEach(item => {
        if (typeof item === 'string') targetIds.push(item);
      });
    }

    if (targetIds.length === 0) {
      res.status(400).json({ error: 'Notification id or ids array is required' });
      return;
    }

    const markedReadIds: string[] = [];
    for (const targetId of targetIds) {
      const updated = await supabaseAdapter.markNotificationAsRead(targetId, user.id, user.role);
      if (updated) {
        markedReadIds.push(targetId);
      }
    }

    if (markedReadIds.length > 0) {
      broadcastNotificationRead(markedReadIds, user.id);
    }

    res.json({
      success: true,
      markedReadIds,
      count: markedReadIds.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Mark all authorized notifications as read
app.post('/api/notifications/mark-all-read', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const factoryId = getResolvedFactoryId(req) || 'FAC-001';
    const markedIds = await supabaseAdapter.markAllNotificationsAsRead(user.id, user.role, factoryId);

    if (markedIds.length > 0) {
      broadcastNotificationRead(markedIds, user.id);
    }

    res.json({
      success: true,
      unreadCount: 0,
      markedReadIds: markedIds
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete / Clear notification
app.delete('/api/notifications/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const deleted = await supabaseAdapter.clearNotification(req.params.id, user.id, user.role);
    if (!deleted) {
      res.status(404).json({ error: 'Notification not found or unauthorized to delete' });
      return;
    }

    // Broadcast clear event to SSE
    const payload = `data: ${JSON.stringify({ type: 'NOTIFICATION_DELETED', id: req.params.id })}\n\n`;
    notificationClients.forEach(c => {
      try { c.res.write(payload); } catch {}
    });

    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Manual dispatch notification endpoint (Supervisor / Admin / Super Admin)
app.post('/api/notifications', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { recipient_user_id, recipient_role, title, message, notification_type, priority, related_module, related_record_id, target_path, meta } = req.body;
    if (!title || !message) {
      res.status(400).json({ error: 'title and message are required' });
      return;
    }

    const notif = await dispatchNotification({
      recipient_user_id,
      recipient_role,
      factory_id: req.user?.factory_id || 'FAC-001',
      title,
      message,
      notification_type: notification_type || 'SYSTEM_HEALTH',
      priority: priority || 'MEDIUM',
      related_module: related_module || 'General',
      related_record_id,
      target_path: target_path || '/overview',
      meta
    });

    res.status(201).json(notif);
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

// ==========================================
// TECHNICIAN MANAGEMENT & RESOLUTION ROUTES
// ==========================================

// GET /api/technicians - List technician profiles
app.get('/api/technicians', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = getResolvedFactoryId(req) || 'FAC-001';
    const profiles = await supabaseAdapter.getTechnicianProfiles(factoryId);
    res.json(profiles);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch technician profiles' });
  }
});

// GET /api/technician-assignments - List assignments with strict role-based access
app.get('/api/technician-assignments', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const factoryId = getResolvedFactoryId(req) || 'FAC-001';
    const user = req.user!;
    const status = (req.query.status as string) || 'ALL';

    let assignments: TechnicianIncidentAssignment[] = [];

    if (user.role === 'TECHNICIAN') {
      // Find matching technician profile IDs
      const allProfiles = await supabaseAdapter.getTechnicianProfiles(factoryId);
      const myProfile = allProfiles.find(
        p => p.user_id === user.id || p.email?.toLowerCase() === user.email?.toLowerCase() || p.id === user.id
      );
      const possibleIds = Array.from(new Set([user.id, myProfile?.id, myProfile?.user_id].filter(Boolean))) as string[];

      assignments = await supabaseAdapter.getTechnicianAssignments({
        factory_id: factoryId,
        technician_ids: possibleIds,
        email: user.email,
        status: status === 'ALL' ? undefined : status
      });
    } else if (user.role === 'PRODUCTION_PLANNER') {
      // Production Planners see operational schedules and machine downtime impact,
      // but sensitive internal technician rejections / private notes are redacted
      const all = await supabaseAdapter.getTechnicianAssignments({
        factory_id: factoryId,
        status: status === 'ALL' ? undefined : status
      });
      assignments = all.map(a => ({
        ...a,
        rejection_reason: a.rejection_reason ? '[Confidential Rejection Filed]' : undefined,
        reassignment_reason: a.reassignment_reason ? '[Reassignment Pending Review]' : undefined
      }));
    } else {
      // Manager/Supervisor, Admin, Super Admin have full management visibility
      assignments = await supabaseAdapter.getTechnicianAssignments({
        factory_id: factoryId,
        status: status === 'ALL' ? undefined : status
      });
    }

    res.json(assignments);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch technician assignments' });
  }
});

// POST /api/technician-assignments/recommend - AI Technician Recommendation
app.post('/api/technician-assignments/recommend', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { incident_id } = req.body;
    if (!incident_id) {
      res.status(400).json({ error: 'incident_id is required' });
      return;
    }

    const recommendation = await supabaseAdapter.recommendTechnicianForIncident(incident_id);
    res.json(recommendation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate technician recommendation' });
  }
});

// POST /api/technician-assignments - Manager assigns incident to technician
app.post('/api/technician-assignments', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      incident_id,
      technician_id,
      priority,
      due_date,
      identified_issue,
      root_cause_analysis,
      recommended_resolution,
      required_tools,
      spare_parts_required,
      estimated_repair_hours,
      ai_recommendation_details
    } = req.body;

    if (!incident_id || !technician_id) {
      res.status(400).json({ error: 'incident_id and technician_id are required' });
      return;
    }

    const incident = db.incidents.find(i => i.id === incident_id || i.incident_id === incident_id);
    const profiles = await supabaseAdapter.getTechnicianProfiles('FAC-001');
    const tech = profiles.find(p => p.user_id === technician_id || p.id === technician_id || p.email === technician_id);
    const machine = incident ? db.machines.find(m => m.id === incident.machine_id) : undefined;

    const assignment = await supabaseAdapter.createTechnicianAssignment({
      incident_id,
      incident_title: incident?.title || req.body.incident_title || 'Equipment Breakdown',
      incident_description: incident?.description || '',
      machine_id: incident?.machine_id || 'M001',
      machine_name: machine?.name || 'Factory Asset',
      machine_code: machine?.machine_id,
      machine_location: machine?.line,
      factory_id: 'FAC-001',
      factory_name: 'Apex Precision Manufacturing',
      technician_id: tech?.user_id || technician_id,
      technician_name: tech?.name || 'Assigned Technician',
      technician_email: tech?.email,
      technician_specialisation: tech?.specialisation || 'Mechanical Technician',
      priority: priority || incident?.severity || 'High',
      due_date: due_date || new Date(Date.now() + 48 * 3600000).toISOString(),
      assigned_by_id: user.id,
      assigned_by_name: user.name,
      assigned_by_role: user.role,
      identified_issue: identified_issue || incident?.title,
      root_cause_analysis,
      recommended_resolution,
      required_tools: required_tools || [],
      spare_parts_required: spare_parts_required || [],
      estimated_repair_hours: estimated_repair_hours || 2.5,
      ai_recommendation_details
    });

    await logAuditEvent(
      req,
      'ASSIGN_TECHNICIAN',
      'IncidentAssignment',
      assignment.id,
      `Assigned incident ${incident_id} to ${assignment.technician_name} (${assignment.technician_specialisation})`
    );

    // Notify assigned technician (strict isolation!)
    if (assignment.technician_id) {
      dispatchNotification({
        recipient_user_id: assignment.technician_id,
        recipient_role: 'TECHNICIAN',
        factory_id: 'FAC-001',
        title: `Action Required: New Incident Assigned (${assignment.priority})`,
        message: `${assignment.incident_title} on ${assignment.machine_name} - Please accept or reject`,
        notification_type: 'ASSIGNMENT_NEW',
        priority: assignment.priority === 'Critical' ? 'CRITICAL' : 'HIGH',
        related_module: 'Technician Incident Assignment',
        related_record_id: assignment.id,
        target_path: '/technician-dashboard',
        meta: `Assigned by: ${user.name} • Due: ${new Date(assignment.due_date).toLocaleDateString()}`
      }).catch(() => {});
    }

    res.status(201).json(assignment);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create technician assignment' });
  }
});

// POST /api/technician-assignments/:id/accept - Technician accepts assignment
app.post('/api/technician-assignments/:id/accept', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'PENDING ACCEPTANCE' && assignment.status !== 'PENDING' && assignment.status !== 'REASSIGNMENT_APPROVED') {
      res.status(400).json({ error: `Cannot accept assignment: Current status is '${assignment.status}', must be 'PENDING ACCEPTANCE'` });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only accept your own assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'ACCEPTED',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: req.body.notes || 'Technician accepted assignment and scheduled work'
    });

    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      status: 'ACCEPTED',
      accepted_at: nowIso,
      history
    });

    await logAuditEvent(req, 'ACCEPT_ASSIGNMENT', 'IncidentAssignment', req.params.id, `Technician ${user.name} accepted assignment ${req.params.id}`);

    // Notify Manager/Supervisor of acceptance
    dispatchNotification({
      recipient_role: 'MANAGER_SUPERVISOR',
      factory_id: 'FAC-001',
      title: `Assignment Accepted: ${assignment.machine_name}`,
      message: `${user.name} accepted repair for ${assignment.incident_title}.`,
      notification_type: 'ASSIGNMENT_ACCEPTED',
      priority: 'MEDIUM',
      related_module: 'Technician Incident Assignment',
      related_record_id: req.params.id,
      target_path: '/manager-dashboard'
    }).catch(() => {});
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept assignment' });
  }
});

// POST /api/technician-assignments/:id/reject - Technician rejects assignment with reason
app.post('/api/technician-assignments/:id/reject', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { rejection_reason } = req.body;
    if (!rejection_reason || !rejection_reason.trim()) {
      res.status(400).json({ error: 'rejection_reason is required' });
      return;
    }

    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'PENDING ACCEPTANCE' && assignment.status !== 'PENDING' && assignment.status !== 'REASSIGNMENT_APPROVED') {
      res.status(400).json({ error: `Cannot reject assignment: Current status is '${assignment.status}', must be 'PENDING ACCEPTANCE'` });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only reject your own assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'REJECTED',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: `Rejected by technician: ${rejection_reason}`
    });

    // Rejection routes to PENDING REASSIGNMENT / REASSIGNMENT_REQUESTED for Manager intervention
    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      status: 'REASSIGNMENT_REQUESTED',
      rejection_reason,
      reassignment_reason: `Technician Rejected: ${rejection_reason}`,
      history
    });

    await logAuditEvent(req, 'REJECT_ASSIGNMENT', 'IncidentAssignment', req.params.id, `Technician ${user.name} rejected assignment ${req.params.id}. Reason: ${rejection_reason}`);

    // Notify Manager/Supervisor of technician rejection
    dispatchNotification({
      recipient_role: 'MANAGER_SUPERVISOR',
      factory_id: 'FAC-001',
      title: `Assignment Rejected by Technician`,
      message: `${user.name} rejected incident "${assignment.incident_title}" on ${assignment.machine_name}. Reason: ${rejection_reason}`,
      notification_type: 'ASSIGNMENT_REJECTED',
      priority: 'HIGH',
      related_module: 'Technician Incident Assignment',
      related_record_id: req.params.id,
      target_path: '/manager-dashboard',
      meta: 'Needs Reassignment'
    }).catch(() => {});

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reject assignment' });
  }
});

// POST /api/technician-assignments/:id/request-reassignment - Technician requests reassignment with reason
app.post('/api/technician-assignments/:id/request-reassignment', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { reassignment_reason } = req.body;
    if (!reassignment_reason || !reassignment_reason.trim()) {
      res.status(400).json({ error: 'reassignment_reason is required' });
      return;
    }

    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only request reassignment for your own assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'REQUESTED_REASSIGNMENT',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: `Reassignment requested: ${reassignment_reason}`
    });

    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      status: 'REASSIGNMENT_REQUESTED',
      reassignment_reason,
      history
    });

    await logAuditEvent(req, 'REQUEST_REASSIGNMENT', 'IncidentAssignment', req.params.id, `Technician ${user.name} requested reassignment: ${reassignment_reason}`);

    // Notify Manager/Supervisor of reassignment request
    dispatchNotification({
      recipient_role: 'MANAGER_SUPERVISOR',
      factory_id: 'FAC-001',
      title: `Reassignment Requested: ${assignment.incident_title}`,
      message: `${user.name} requested reassignment for ${assignment.machine_name}: ${reassignment_reason}`,
      notification_type: 'REASSIGNMENT_REQUESTED',
      priority: 'HIGH',
      related_module: 'Technician Incident Assignment',
      related_record_id: req.params.id,
      target_path: '/manager-dashboard'
    }).catch(() => {});

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to request reassignment' });
  }
});

// POST /api/technician-assignments/:id/review-reassignment - Manager approves or rejects reassignment
app.post('/api/technician-assignments/:id/review-reassignment', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { decision, new_technician_id, manager_notes } = req.body; // 'APPROVE' or 'REJECT'
    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];

    if (decision === 'APPROVE') {
      const profiles = await supabaseAdapter.getTechnicianProfiles('FAC-001');
      const newTech = new_technician_id ? profiles.find(p => p.user_id === new_technician_id || p.id === new_technician_id) : undefined;
      
      history.push({
        timestamp: nowIso,
        action: 'REASSIGNMENT_APPROVED',
        performed_by_id: user.id,
        performed_by_name: user.name,
        performed_by_role: user.role,
        notes: `Reassignment approved by manager. ${newTech ? `Reassigned to ${newTech.name}.` : ''} Notes: ${manager_notes || 'None'}`
      });

      const updates: Partial<TechnicianIncidentAssignment> = {
        status: newTech ? 'PENDING ACCEPTANCE' : 'REASSIGNMENT_APPROVED',
        history
      };

      if (newTech) {
        updates.technician_id = newTech.user_id;
        updates.technician_name = newTech.name;
        updates.technician_email = newTech.email;
        updates.technician_specialisation = newTech.specialisation;
      }

      const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, updates);
      await logAuditEvent(req, 'APPROVE_REASSIGNMENT', 'IncidentAssignment', req.params.id, `Manager ${user.name} approved reassignment for ${req.params.id}`);
      res.json(updated);
    } else {
      history.push({
        timestamp: nowIso,
        action: 'REASSIGNMENT_REJECTED',
        performed_by_id: user.id,
        performed_by_name: user.name,
        performed_by_role: user.role,
        notes: `Reassignment declined by manager: ${manager_notes || 'Technician must retain assignment.'}`
      });

      const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
        status: 'ACCEPTED',
        history
      });
      await logAuditEvent(req, 'REJECT_REASSIGNMENT', 'IncidentAssignment', req.params.id, `Manager ${user.name} declined reassignment request for ${req.params.id}`);
      res.json(updated);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to review reassignment' });
  }
});

// POST /api/technician-assignments/:id/start-repair - Technician begins repair
app.post('/api/technician-assignments/:id/start-repair', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'ACCEPTED' && assignment.status !== 'IN PROGRESS') {
      res.status(400).json({ error: `Cannot start repair: Current status is '${assignment.status}', must be 'ACCEPTED'` });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only start your own repair assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'STARTED_REPAIR',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: req.body.notes || 'Repair initiated on machine with LOTO verified'
    });

    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      status: 'IN PROGRESS',
      repair_started_at: nowIso,
      repair_progress_percent: Math.max(10, assignment.repair_progress_percent || 0),
      history
    });

    await logAuditEvent(req, 'START_REPAIR', 'IncidentAssignment', req.params.id, `Technician ${user.name} started repair on ${assignment.machine_name}`);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to start repair' });
  }
});

// POST /api/technician-assignments/:id/progress-update - Log repair diagnosis and %
app.post('/api/technician-assignments/:id/progress-update', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { progress_percent, diagnosis_notes, additional_problems_found } = req.body;
    if (progress_percent === undefined || !diagnosis_notes) {
      res.status(400).json({ error: 'progress_percent and diagnosis_notes are required' });
      return;
    }

    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only update progress on your own assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newUpdate: RepairProgressUpdate = {
      id: `UPD-${Date.now().toString().slice(-5)}`,
      timestamp: nowIso,
      progress_percent: Number(progress_percent),
      diagnosis_notes,
      additional_problems_found,
      updated_by_id: user.id,
      updated_by_name: user.name
    };

    const updates = [...(assignment.progress_updates || []), newUpdate];
    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'PROGRESS_UPDATE',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: `Progress logged: ${progress_percent}%. Notes: ${diagnosis_notes}`
    });

    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      repair_progress_percent: Number(progress_percent),
      repair_notes: diagnosis_notes,
      progress_updates: updates,
      history
    });

    await logAuditEvent(req, 'UPDATE_REPAIR_PROGRESS', 'IncidentAssignment', req.params.id, `Repair progress on ${assignment.machine_name}: ${progress_percent}%`);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record progress update' });
  }
});

// POST /api/technician-assignments/:id/resolve - Technician submits completed repair for verification
app.post('/api/technician-assignments/:id/resolve', authenticate, authorizeRole('TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const {
      confirmed_root_cause,
      actions_taken,
      parts_used,
      actual_repair_hours,
      resolution_remarks
    } = req.body;

    if (!confirmed_root_cause || !actions_taken || actual_repair_hours === undefined) {
      res.status(400).json({ error: 'confirmed_root_cause, actions_taken, and actual_repair_hours are required' });
      return;
    }

    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'IN PROGRESS' && assignment.status !== 'ACCEPTED') {
      res.status(400).json({ error: `Cannot submit resolution: Current status is '${assignment.status}', must be 'IN PROGRESS'` });
      return;
    }

    const isAuthorized =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (!isAuthorized) {
      res.status(403).json({ error: 'Forbidden: You can only resolve your own assignments' });
      return;
    }

    const nowIso = new Date().toISOString();
    const resolution_submission: IncidentResolutionSubmission = {
      confirmed_root_cause,
      actions_taken,
      parts_used: parts_used || [],
      actual_repair_hours: Number(actual_repair_hours),
      resolution_remarks: resolution_remarks || '',
      submitted_at: nowIso
    };

    const history = [...(assignment.history || [])];
    history.push({
      timestamp: nowIso,
      action: 'MARKED_RESOLVED',
      performed_by_id: user.id,
      performed_by_name: user.name,
      performed_by_role: user.role,
      notes: `Repair finished in ${actual_repair_hours}h and submitted for Manager verification.`
    });

    const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
      status: 'RESOLVED_PENDING_VERIFICATION',
      resolved_at: nowIso,
      repair_progress_percent: 100,
      resolution_submission,
      history
    });

    await logAuditEvent(req, 'RESOLVE_ASSIGNMENT', 'IncidentAssignment', req.params.id, `Technician ${user.name} submitted repair resolution for ${assignment.machine_name} (${actual_repair_hours} hrs)`);

    // Notify Manager/Supervisor of pending verification
    dispatchNotification({
      recipient_role: 'MANAGER_SUPERVISOR',
      factory_id: 'FAC-001',
      title: `Verification Required: Repair Completed`,
      message: `${user.name} resolved incident on ${assignment.machine_name}. Ready for inspection & sign-off.`,
      notification_type: 'REPAIR_VERIFICATION_PENDING',
      priority: 'HIGH',
      related_module: 'Technician Incident Assignment',
      related_record_id: req.params.id,
      target_path: '/manager-dashboard',
      meta: `Technician: ${user.name} • Actual hours: ${actual_repair_hours}h`
    }).catch(() => {});

    // Notify Admin of maintenance update
    dispatchNotification({
      recipient_role: 'ADMIN',
      factory_id: 'FAC-001',
      title: `Maintenance Update: Repair Completed on ${assignment.machine_name}`,
      message: `${user.name} finished repair. Pending supervisor verification.`,
      notification_type: 'WORK_ORDER_UPDATE',
      priority: 'MEDIUM',
      related_module: 'Technician Incident Assignment',
      related_record_id: req.params.id,
      target_path: '/incidents'
    }).catch(() => {});

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to submit resolution' });
  }
});

// POST /api/technician-assignments/:id/verify - Manager verifies resolution
app.post('/api/technician-assignments/:id/verify', authenticate, authorizeRole('ADMIN', 'SUPER_ADMIN', 'MANAGER_SUPERVISOR'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const { decision, verification_notes, quality_rating, rework_instructions } = req.body; // 'APPROVE' or 'REJECT'
    const assignment = await supabaseAdapter.getTechnicianAssignment(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.status !== 'RESOLVED_PENDING_VERIFICATION') {
      res.status(400).json({ error: `Cannot verify assignment: Current status is '${assignment.status}', must be 'RESOLVED_PENDING_VERIFICATION'` });
      return;
    }

    const isSelfRepair =
      assignment.technician_id === user.id ||
      assignment.technician_email?.toLowerCase() === user.email?.toLowerCase() ||
      (assignment.technician_name && user.name && (
        assignment.technician_name.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]) ||
        user.name.toLowerCase().includes(assignment.technician_name.toLowerCase().split(' ')[0])
      ));

    if (isSelfRepair && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({ error: 'Segregation of Duties: Technicians cannot verify and sign off on their own repair resolution' });
      return;
    }

    const nowIso = new Date().toISOString();
    const history = [...(assignment.history || [])];

    if (decision === 'APPROVE') {
      const verification_details: IncidentVerificationDetails = {
        verified_by_id: user.id,
        verified_by_name: user.name,
        verified_by_role: user.role,
        verified_at: nowIso,
        verification_notes: verification_notes || 'Repair verified and approved according to SOP standards.',
        quality_rating: Number(quality_rating || 5)
      };

      history.push({
        timestamp: nowIso,
        action: 'VERIFIED',
        performed_by_id: user.id,
        performed_by_name: user.name,
        performed_by_role: user.role,
        notes: `Repair verified and approved by ${user.name}. Quality Rating: ${quality_rating || 5}/5`
      });

      history.push({
        timestamp: nowIso,
        action: 'CLOSED',
        performed_by_id: user.id,
        performed_by_name: user.name,
        performed_by_role: user.role,
        notes: 'Incident lifecycle closed.'
      });

      const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
        status: 'VERIFIED',
        verified_at: nowIso,
        verification_details,
        history
      });

      await logAuditEvent(req, 'VERIFY_RESOLUTION', 'IncidentAssignment', req.params.id, `Manager ${user.name} approved resolution for assignment ${req.params.id}`);

      // Notify assigned technician of verification approval
      if (assignment.technician_id) {
        dispatchNotification({
          recipient_user_id: assignment.technician_id,
          recipient_role: 'TECHNICIAN',
          factory_id: 'FAC-001',
          title: `Repair Verified & Approved! (★ ${quality_rating || 5}/5)`,
          message: `Manager ${user.name} verified and approved your repair on ${assignment.machine_name}.`,
          notification_type: 'REPAIR_VERIFIED',
          priority: 'MEDIUM',
          related_module: 'Technician Incident Assignment',
          related_record_id: req.params.id,
          target_path: '/technician-dashboard'
        }).catch(() => {});
      }

      // Notify Production Planner that machine is restored to availability
      dispatchNotification({
        recipient_role: 'PRODUCTION_PLANNER',
        factory_id: 'FAC-001',
        title: `Machine Restored to Availability: ${assignment.machine_name}`,
        message: `Repair on ${assignment.machine_name} verified and operational.`,
        notification_type: 'MACHINE_STATUS_CHANGE',
        priority: 'MEDIUM',
        related_module: 'Production',
        related_record_id: assignment.machine_id,
        target_path: '/production-planner-dashboard'
      }).catch(() => {});

      res.json(updated);
    } else {
      // Rejection: return to IN PROGRESS for rework
      history.push({
        timestamp: nowIso,
        action: 'REOPENED_FOR_REWORK',
        performed_by_id: user.id,
        performed_by_name: user.name,
        performed_by_role: user.role,
        notes: `Resolution rejected by manager. Rework required: ${rework_instructions || verification_notes || 'Review root cause and re-test.'}`
      });

      const updated = await supabaseAdapter.updateTechnicianAssignment(req.params.id, {
        status: 'IN PROGRESS',
        repair_progress_percent: 75,
        history
      });

      await logAuditEvent(req, 'REJECT_RESOLUTION', 'IncidentAssignment', req.params.id, `Manager ${user.name} rejected resolution for ${req.params.id}, requesting rework`);

      // Notify assigned technician that rework is required
      if (assignment.technician_id) {
        dispatchNotification({
          recipient_user_id: assignment.technician_id,
          recipient_role: 'TECHNICIAN',
          factory_id: 'FAC-001',
          title: `Repair Rejected - Rework Required`,
          message: `Manager ${user.name} returned repair on ${assignment.machine_name} for rework. Reason: ${rework_instructions || verification_notes || 'Review root cause and re-test.'}`,
          notification_type: 'REPAIR_REWORK_REQUIRED',
          priority: 'HIGH',
          related_module: 'Technician Incident Assignment',
          related_record_id: req.params.id,
          target_path: '/technician-dashboard'
        }).catch(() => {});
      }

      res.json(updated);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to verify assignment' });
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
