-- ============================================================================
-- FACTORYOPS AI: TECHNICIAN INCIDENT ASSIGNMENT & RESOLUTION MIGRATION
-- Database: Supabase PostgreSQL
-- Idempotent Migration Script: safe to run multiple times
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. TECHNICIAN PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technician_profiles (
  id TEXT PRIMARY KEY,                             -- e.g. 'TECH-001'
  user_id TEXT NOT NULL,                           -- FK to public.users(id)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialisation TEXT NOT NULL,                    -- e.g. 'Mechanical Technician', 'Electrical Technician'
  secondary_specialisations TEXT[] DEFAULT '{}',
  technical_skills TEXT[] DEFAULT '{}',
  experience_years NUMERIC(4, 1) DEFAULT 0,
  assigned_factory_id TEXT DEFAULT 'FAC-001',
  assigned_factory_name TEXT DEFAULT 'Apex Precision Manufacturing',
  availability_status TEXT DEFAULT 'AVAILABLE',    -- 'AVAILABLE', 'BUSY', 'ON_LEAVE', 'OFF_SHIFT'
  current_workload INTEGER DEFAULT 0,
  active_assignments_count INTEGER DEFAULT 0,
  max_concurrent_assignments INTEGER DEFAULT 3,
  certifications TEXT[] DEFAULT '{}',
  shift TEXT DEFAULT 'General (09:00 - 17:30)',
  phone TEXT,
  rating NUMERIC(3, 2) DEFAULT 4.80,
  completed_repairs_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for technician lookups
CREATE INDEX IF NOT EXISTS idx_tech_profiles_user_id ON public.technician_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_tech_profiles_spec ON public.technician_profiles(specialisation);
CREATE INDEX IF NOT EXISTS idx_tech_profiles_factory ON public.technician_profiles(assigned_factory_id);
CREATE INDEX IF NOT EXISTS idx_tech_profiles_avail ON public.technician_profiles(availability_status);

-- ----------------------------------------------------------------------------
-- 2. TECHNICIAN INCIDENT ASSIGNMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.technician_incident_assignments (
  id TEXT PRIMARY KEY,                             -- e.g. 'ASN-2026-001'
  incident_id TEXT NOT NULL,                       -- links to public.incidents
  incident_title TEXT NOT NULL,
  incident_description TEXT,
  machine_id TEXT NOT NULL,                        -- links to public.machines
  machine_name TEXT NOT NULL,
  machine_code TEXT,
  machine_location TEXT,
  factory_id TEXT NOT NULL DEFAULT 'FAC-001',
  factory_name TEXT DEFAULT 'Apex Precision Manufacturing',
  technician_id TEXT NOT NULL,                     -- links to technician_profiles(user_id) or users(id)
  technician_name TEXT NOT NULL,
  technician_email TEXT,
  technician_specialisation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING ACCEPTANCE', -- 'PENDING ACCEPTANCE', 'ACCEPTED', 'IN PROGRESS', 'REASSIGNMENT_REQUESTED', 'RESOLVED_PENDING_VERIFICATION', 'VERIFIED', 'CLOSED', 'REJECTED'
  priority TEXT NOT NULL DEFAULT 'High',            -- 'Critical', 'High', 'Medium', 'Low'
  assigned_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  is_overdue BOOLEAN DEFAULT FALSE,
  assigned_by_id TEXT NOT NULL,                    -- Manager/Admin user ID
  assigned_by_name TEXT NOT NULL,
  assigned_by_role TEXT NOT NULL DEFAULT 'MANAGER_SUPERVISOR',
  accepted_at TIMESTAMPTZ,
  repair_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  repair_progress_percent INTEGER DEFAULT 0,
  repair_notes TEXT,
  rejection_reason TEXT,
  reassignment_reason TEXT,
  identified_issue TEXT,
  root_cause_analysis TEXT,
  recommended_resolution TEXT,
  required_tools TEXT[] DEFAULT '{}',
  spare_parts_required JSONB DEFAULT '[]'::jsonb,
  estimated_repair_hours NUMERIC(4, 2) DEFAULT 2.50,
  ai_recommendation_details JSONB,
  resolution_submission JSONB,
  verification_details JSONB,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_tech_id ON public.technician_incident_assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_assignments_incident_id ON public.technician_incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_assignments_factory_id ON public.technician_incident_assignments(factory_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.technician_incident_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON public.technician_incident_assignments(created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. REPAIR PROGRESS UPDATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.repair_progress_updates (
  id TEXT PRIMARY KEY,                             -- e.g. 'UPD-1001'
  assignment_id TEXT NOT NULL REFERENCES public.technician_incident_assignments(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  progress_percent INTEGER NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
  diagnosis_notes TEXT NOT NULL,
  additional_problems_found TEXT,
  updated_by_id TEXT NOT NULL,
  updated_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_updates_assignment_id ON public.repair_progress_updates(assignment_id);

-- ----------------------------------------------------------------------------
-- 4. REASSIGNMENT REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reassignment_requests (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL REFERENCES public.technician_incident_assignments(id) ON DELETE CASCADE,
  technician_id TEXT NOT NULL,
  reassignment_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',          -- 'PENDING', 'APPROVED', 'REJECTED'
  reviewed_by_id TEXT,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  manager_notes TEXT,
  new_technician_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassignment_assignment_id ON public.reassignment_requests(assignment_id);

-- ----------------------------------------------------------------------------
-- 5. INCIDENT RESOLUTION SUBMISSIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_resolution_submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES public.technician_incident_assignments(id) ON DELETE CASCADE,
  confirmed_root_cause TEXT NOT NULL,
  actions_taken TEXT NOT NULL,
  parts_used JSONB DEFAULT '[]'::jsonb,
  actual_repair_hours NUMERIC(4, 2) NOT NULL,
  resolution_remarks TEXT,
  submitted_by_id TEXT NOT NULL,
  submitted_by_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. INCIDENT VERIFICATION DETAILS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_verification_details (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL UNIQUE REFERENCES public.technician_incident_assignments(id) ON DELETE CASCADE,
  verified_by_id TEXT NOT NULL,
  verified_by_name TEXT NOT NULL,
  verified_by_role TEXT NOT NULL DEFAULT 'MANAGER_SUPERVISOR',
  verification_notes TEXT NOT NULL,
  quality_rating INTEGER DEFAULT 5 CHECK (quality_rating >= 1 AND quality_rating <= 5),
  decision TEXT NOT NULL DEFAULT 'APPROVE',        -- 'APPROVE' or 'REWORK'
  rework_instructions TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.technician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_incident_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_progress_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reassignment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_resolution_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_verification_details ENABLE ROW LEVEL SECURITY;

-- Allow service_role full unrestricted access
DROP POLICY IF EXISTS "service_role_all_tech_profiles" ON public.technician_profiles;
CREATE POLICY "service_role_all_tech_profiles" ON public.technician_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_assignments" ON public.technician_incident_assignments;
CREATE POLICY "service_role_all_assignments" ON public.technician_incident_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_progress" ON public.repair_progress_updates;
CREATE POLICY "service_role_all_progress" ON public.repair_progress_updates FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_reassign" ON public.reassignment_requests;
CREATE POLICY "service_role_all_reassign" ON public.reassignment_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_resolution" ON public.incident_resolution_submissions;
CREATE POLICY "service_role_all_resolution" ON public.incident_resolution_submissions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_verification" ON public.incident_verification_details;
CREATE POLICY "service_role_all_verification" ON public.incident_verification_details FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow authenticated users to read technician profiles and assignments
DROP POLICY IF EXISTS "auth_read_tech_profiles" ON public.technician_profiles;
CREATE POLICY "auth_read_tech_profiles" ON public.technician_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_assignments" ON public.technician_incident_assignments;
CREATE POLICY "auth_read_assignments" ON public.technician_incident_assignments FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 8. SEED USERS & TECHNICIAN PROFILES
-- ----------------------------------------------------------------------------
-- Ensure technician user accounts exist in public.users
INSERT INTO public.users (id, name, email, role, factory_id, factory_name, status, password_hash, salt, created_at)
VALUES 
  ('USR-012', 'Ramesh Varma (Senior Technician)', 'tech.apex@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '6cbe26ee13b43613f65233415a2225deb055e92627693c814df3e8bb9fa378b15e283a4cf0ad566ac4e627bf059facda9d3f51ff42f13eb9b71a4e03d437c25e', 'ade2d534a50f4de898cc62276cc162ed', NOW()),
  ('USR-013', 'Anil Sharma (Technician)', 'tech.nova@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', 'ce1441fba1fabd88874bb6038fd1bf2bb103a3a2ff6916e41058b5ade84578d87d9e51bcfe7e0091e551229b931a8d78a1d0c13f83b85728854f3368f03ad280', '7a5011863c669a196e8bf20895717d8e', NOW()),
  ('USR-014', 'Praveen Nair (Technician)', 'tech.vertex@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '85294485649b5d54bf3ed40744b80d5579865a700225182a8053cb1d4b69463a27060338a1d575ae3ed3eea7b1af32fdb3b6a7b1de18ac6c09f296050a7000e0', 'ee695304dba6a55331cbcdef910946ec', NOW()),
  ('USR-018', 'Vikram Singh (Robotics Specialist)', 'tech.robotics@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '6cbe26ee13b43613f65233415a2225deb055e92627693c814df3e8bb9fa378b15e283a4cf0ad566ac4e627bf059facda9d3f51ff42f13eb9b71a4e03d437c25e', 'ade2d534a50f4de898cc62276cc162ed', NOW()),
  ('USR-019', 'Rajesh Menon (Fluid Power Specialist)', 'tech.hydraulics@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '6cbe26ee13b43613f65233415a2225deb055e92627693c814df3e8bb9fa378b15e283a4cf0ad566ac4e627bf059facda9d3f51ff42f13eb9b71a4e03d437c25e', 'ade2d534a50f4de898cc62276cc162ed', NOW()),
  ('USR-020', 'Sunita Rao (Instrumentation Engineer)', 'tech.instruments@factoryops.com', 'TECHNICIAN', 'FAC-001', 'Apex Precision Manufacturing', 'active', '6cbe26ee13b43613f65233415a2225deb055e92627693c814df3e8bb9fa378b15e283a4cf0ad566ac4e627bf059facda9d3f51ff42f13eb9b71a4e03d437c25e', 'ade2d534a50f4de898cc62276cc162ed', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- Upsert Technician Profiles
INSERT INTO public.technician_profiles (
  id, user_id, name, email, specialisation, secondary_specialisations,
  technical_skills, experience_years, assigned_factory_id, assigned_factory_name,
  availability_status, current_workload, active_assignments_count, max_concurrent_assignments,
  certifications, shift, phone, rating, completed_repairs_count
) VALUES
  (
    'TECH-001', 'USR-012', 'Ramesh Varma', 'tech.apex@factoryops.com', 'Mechanical Technician',
    ARRAY['CNC Technician'],
    ARRAY['Spindle Alignment', 'Bearing Replacement', 'Vibration Analysis', 'Gearbox Overhaul', 'Precision Machining', 'Dial Indicator Calibration'],
    9.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 1, 1, 3,
    ARRAY['ISO 18436 Vibration Cat II', 'SKF Certified Maintenance Specialist'],
    'Morning (06:00 - 14:00)', '+91 98490 12012', 4.90, 87
  ),
  (
    'TECH-002', 'USR-013', 'Anil Sharma', 'tech.nova@factoryops.com', 'Electrical Technician',
    ARRAY['Instrumentation Technician'],
    ARRAY['PLC Diagnostics', 'VFD Configuration', 'Control Panel Wiring', 'Thermal Imaging', 'Power Distribution 415V', 'Relay Logic'],
    7.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 1, 1, 3,
    ARRAY['Certified Electrical Safety Worker (NFPA 70E)', 'Siemens S7-1200 Certified'],
    'General (09:00 - 17:30)', '+91 98490 12013', 4.80, 64
  ),
  (
    'TECH-003', 'USR-014', 'Praveen Nair', 'tech.vertex@factoryops.com', 'CNC Technician',
    ARRAY['Mechanical Technician'],
    ARRAY['Fanuc 31i Diagnostics', 'Ballscrew Backlash Calibration', 'Tool Changer Alignment', 'G-Code Optimization', 'Linear Guide Rail Replacement'],
    6.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 1, 1, 3,
    ARRAY['Fanuc Certified Maintenance Specialist', 'Heidenhain Linear Encoders'],
    'Afternoon (14:00 - 22:00)', '+91 98490 12014', 4.70, 53
  ),
  (
    'TECH-004', 'USR-018', 'Vikram Singh', 'tech.robotics@factoryops.com', 'Automation & Robotics Technician',
    ARRAY['Electrical Technician'],
    ARRAY['KUKA KRC4 Programming', 'ABB IRC5 Calibration', 'EOAT Pneumatics', 'Safety Interlock Wiring', 'Servo Drive Tuning', 'Industrial Ethernet'],
    8.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 1, 1, 3,
    ARRAY['KUKA System Integrator Certified', 'FANUC Robotics Core Operations'],
    'Morning (06:00 - 14:00)', '+91 98490 12018', 4.90, 72
  ),
  (
    'TECH-005', 'USR-019', 'Rajesh Menon', 'tech.hydraulics@factoryops.com', 'Hydraulic & Pneumatic Technician',
    ARRAY['Mechanical Technician'],
    ARRAY['Proportional Valve Calibration', 'Accumulator Charging', 'High-Pressure Hose Crimp', 'Pneumatic Manifold Troubleshooting', 'Oil Contamination Testing'],
    11.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 1, 1, 3,
    ARRAY['IFPS Certified Hydraulic Specialist', 'Parker Fluid Power Cert'],
    'General (09:00 - 17:30)', '+91 98490 12019', 4.95, 115
  ),
  (
    'TECH-006', 'USR-020', 'Sunita Rao', 'tech.instruments@factoryops.com', 'Instrumentation Technician',
    ARRAY['Electrical Technician'],
    ARRAY['4-20mA Loop Calibration', 'RTD & Thermocouple Verification', 'Flowmeter Tuning', 'SCADA I/O Mapping', 'Pressure Transmitter Calibration', 'PID Loop Tuning'],
    5.0, 'FAC-001', 'Apex Precision Manufacturing',
    'AVAILABLE', 0, 0, 3,
    ARRAY['ISA Certified Control Systems Technician (CCST)', 'Yokogawa Instrumentation'],
    'General (09:00 - 17:30)', '+91 98490 12020', 4.85, 48
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  specialisation = EXCLUDED.specialisation,
  technical_skills = EXCLUDED.technical_skills,
  experience_years = EXCLUDED.experience_years,
  availability_status = EXCLUDED.availability_status,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 9. SEED INITIAL TECHNICIAN INCIDENT ASSIGNMENTS
-- ----------------------------------------------------------------------------
-- Include active and pending acceptance assignments across technicians so
-- when any technician logs in, they see their actionable cards and buttons.
INSERT INTO public.technician_incident_assignments (
  id, incident_id, incident_title, incident_description,
  machine_id, machine_name, machine_code, machine_location,
  factory_id, factory_name, technician_id, technician_name, technician_email, technician_specialisation,
  status, priority, assigned_date, due_date, is_overdue,
  assigned_by_id, assigned_by_name, assigned_by_role,
  repair_progress_percent, identified_issue, root_cause_analysis, recommended_resolution,
  required_tools, spare_parts_required, estimated_repair_hours,
  ai_recommendation_details, history
) VALUES
  (
    'ASN-2026-001', 'INC-0001', 'Spindle Bearing Thermal Runaway & Excessive Vibration',
    'High frequency harmonic chatter and 4.8 mm/s RMS vibration detected on CNC Milling spindle axis.',
    'M001', 'Apex 5-Axis CNC Machining Center 01', 'APX-CNC-01', 'Bay 1 - Heavy Machining',
    'FAC-001', 'Apex Precision Manufacturing', 'USR-012', 'Ramesh Varma', 'tech.apex@factoryops.com', 'Mechanical Technician',
    'IN PROGRESS', 'High', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', FALSE,
    'USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'MANAGER_SUPERVISOR',
    50, 'Excessive spindle bearing vibration and temperature rising above 78°C',
    'High radial preload caused thermal breakdown of lubricant and micro-spalling on inner race',
    'Extract ceramic hybrid bearing set SKF-7014, check shaft runout, re-seat with precision spacer',
    ARRAY['Spindle Puller Set', 'Dial Test Indicator (0.001mm)', 'Torque Wrench 40Nm', 'Bearing Induction Heater'],
    '[{"part_id":"PRT-1001","part_number":"SKF-7014-ACD","part_name":"Spindle High-Precision Ceramic Bearing","quantity":2,"is_in_stock":true,"status":"Reserved"}]'::jsonb,
    3.5,
    '{"match_score": 96, "reasoning": "Ramesh Varma has 9 years of mechanical experience and ISO vibration certification.", "matched_skills": ["Spindle Alignment", "Bearing Replacement"]}'::jsonb,
    '[{"action":"ASSIGNED","timestamp":"2026-10-30T09:00:00Z","performed_by_name":"Amit Deshmukh"},{"action":"ACCEPTED","timestamp":"2026-10-30T09:18:22Z","performed_by_name":"Ramesh Varma"},{"action":"STARTED_REPAIR","timestamp":"2026-10-30T10:15:00Z","performed_by_name":"Ramesh Varma"}]'::jsonb
  ),
  (
    'ASN-2026-002', 'INC-0073', 'Seal Micro-Extrusion & Hydraulic Tonnage Loss',
    'Hydraulic ram cylinder oil weeping and pressure decay from 220 bar to 165 bar during full stroke clamping.',
    'M007', 'Hydraulic Stamping Press 01', 'APX-PRS-01', 'Bay 3 - Stamping & Forming',
    'FAC-001', 'Apex Precision Manufacturing', 'USR-019', 'Rajesh Menon', 'tech.hydraulics@factoryops.com', 'Hydraulic & Pneumatic Technician',
    'RESOLVED_PENDING_VERIFICATION', 'High', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', FALSE,
    'USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'MANAGER_SUPERVISOR',
    100, 'Hydraulic ram oil seal degradation and pressure droop during 120-ton cycle',
    'Thermal fatigue of primary polyurethane chevron seal due to contaminated fluid particulate spike',
    'Depressurize accumulator, replace valve block seal kit VTN-OR-K50, filter fluid, bleed air',
    ARRAY['Hydraulic Pressure Gauge Kit (0-400 Bar)', 'Spanner Set 32mm', 'Fluid Bleed Hose'],
    '[{"part_id":"PRT-1002","part_number":"VTN-OR-K50","part_name":"Hydraulic Valve Block Viton O-Ring Seal Kit","quantity":1,"is_in_stock":true,"status":"Used"}]'::jsonb,
    4.0,
    '{"match_score": 98, "reasoning": "Rajesh Menon has 11 years experience as IFPS certified fluid power specialist.", "matched_skills": ["Proportional Valve Calibration"]}'::jsonb,
    '[{"action":"ASSIGNED","timestamp":"2026-10-29T10:00:00Z","performed_by_name":"Amit Deshmukh"},{"action":"ACCEPTED","timestamp":"2026-10-29T10:12:00Z","performed_by_name":"Rajesh Menon"},{"action":"MARKED_RESOLVED","timestamp":"2026-10-30T15:30:00Z","performed_by_name":"Rajesh Menon"}]'::jsonb
  ),
  (
    'ASN-2026-003', 'INC-0013', 'MIG Welder Robotic Arm Axis 4 Servo Position Jitter',
    'Positional tracking error 0.6mm on Wrist Axis 4 during seam welding of chassis sub-frame.',
    'M013', 'Robotic MIG Welding Cell 01', 'APX-ROB-01', 'Bay 2 - Robotic Assembly',
    'FAC-001', 'Apex Precision Manufacturing', 'USR-018', 'Vikram Singh', 'tech.robotics@factoryops.com', 'Automation & Robotics Technician',
    'PENDING ACCEPTANCE', 'Critical', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '24 hours', FALSE,
    'USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'MANAGER_SUPERVISOR',
    0, 'Wrist Axis 4 servo driver tracking variance > 0.5mm causing rough weld bead profile',
    'Optical resolver cable shielding abrasion and high electrical noise from high frequency arc stabilizer',
    'Replace resolver cable harness, verify ferrite chokes on 400V drive leads, recalibrate axis home offset',
    ARRAY['KUKA SmartPAD Teach Pendant', 'Oscilloscope Fluke 190', 'Hex Calibration Pin Set'],
    '[]'::jsonb,
    3.0,
    '{"match_score": 95, "reasoning": "Vikram Singh is a certified KUKA robotics specialist with deep experience in robotic wrist kinematics.", "matched_skills": ["KUKA KRC4 Programming", "Servo Drive Tuning"]}'::jsonb,
    '[{"action":"ASSIGNED","timestamp":"2026-10-28T14:00:00Z","performed_by_name":"Amit Deshmukh"}]'::jsonb
  ),
  (
    'ASN-2026-004', 'INC-0083', 'VFD Over-Torque Trip on Drive Shaft Conveyor',
    'ABB ACS880 drive tripped on error 3210 (Overcurrent) during high acceleration step.',
    'M005', 'Shaft Induction Hardening Unit 01', 'APX-IND-01', 'Bay 1 - Thermal Treatment',
    'FAC-001', 'Apex Precision Manufacturing', 'USR-013', 'Anil Sharma', 'tech.nova@factoryops.com', 'Electrical Technician',
    'PENDING ACCEPTANCE', 'Medium', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 hours', FALSE,
    'USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'MANAGER_SUPERVISOR',
    0, 'Intermittent VFD trip under mechanical load transients',
    'Motor thermal resistance shift and current loop gain parameter too aggressive for winter ambient',
    'Run motor ID run, adjust acceleration ramp from 1.8s to 2.4s, inspect motor terminal box for moisture',
    ARRAY['Fluke 87V Industrial Multimeter', 'Insulated Screwdriver Set 1000V', 'Megger Insulation Tester'],
    '[]'::jsonb,
    2.0,
    '{"match_score": 92, "reasoning": "Anil Sharma is skilled in VFD parameter optimization, motor protection relays, and 415V electrical panels.", "matched_skills": ["VFD Configuration", "PLC Diagnostics"]}'::jsonb,
    '[{"action":"ASSIGNED","timestamp":"2026-10-30T11:00:00Z","performed_by_name":"Amit Deshmukh"}]'::jsonb
  ),
  (
    'ASN-2026-005', 'INC-0021', 'Secondary Spindle Runout Deviation on Milling Center',
    'Excessive spindle axial runout > 8 microns measured on finish cut stage.',
    'M001', 'Apex 5-Axis CNC Machining Center 01', 'APX-CNC-01', 'Bay 1 - Heavy Machining',
    'FAC-001', 'Apex Precision Manufacturing', 'USR-012', 'Ramesh Varma', 'tech.apex@factoryops.com', 'Mechanical Technician',
    'PENDING ACCEPTANCE', 'High', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '36 hours', FALSE,
    'USR-007', 'Amit Deshmukh (Manager/Supervisor)', 'MANAGER_SUPERVISOR',
    0, 'Secondary spindle taper contamination causing tool holder runout',
    'Debris accumulation on BT40 taper contact face',
    'Clean spindle taper with cleaning arbor, verify drawbar clamping force',
    ARRAY['Taper Cleaning Stick', 'Clamping Force Gauge', 'Dial Indicator (0.001mm)'],
    '[]'::jsonb,
    1.5,
    '{"match_score": 94, "reasoning": "Ramesh Varma is primary mechanical technician for Apex Bay 1.", "matched_skills": ["Spindle Alignment", "Precision Machining"]}'::jsonb,
    '[{"action":"ASSIGNED","timestamp":"2026-10-30T12:00:00Z","performed_by_name":"Amit Deshmukh"}]'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  incident_title = EXCLUDED.incident_title,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- End of Migration Script
-- ----------------------------------------------------------------------------
