import React from 'react';

interface IndustrialRoboticArmProps {
  side: 'left' | 'right';
  className?: string;
}

export const IndustrialRoboticArm: React.FC<IndustrialRoboticArmProps> = ({ side, className = '' }) => {
  const isRight = side === 'right';

  return (
    <div className={`relative w-72 h-[550px] lg:h-[650px] xl:w-96 flex items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 500 700"
        className={`w-full h-full drop-shadow-2xl ${isRight ? '-scale-x-100' : ''}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Metallic Gradients */}
          <linearGradient id="metalBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          <linearGradient id="metalArm" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id="hydraulicPiston" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#0e79b2" />
            <stop offset="100%" stopColor="#0369a1" />
          </linearGradient>

          <linearGradient id="accentOrange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floor Mounting Pedestal */}
        <g transform="translate(100, 580)">
          {/* Base plate */}
          <path d="M 30 60 L 170 60 L 190 100 L 10 100 Z" fill="url(#metalBase)" stroke="#475569" strokeWidth="2" />
          <ellipse cx="100" cy="60" rx="70" ry="15" fill="#475569" stroke="#64748b" strokeWidth="2" />
          
          {/* Mounting Bolts */}
          <circle cx="45" cy="80" r="5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
          <circle cx="155" cy="80" r="5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
          <circle cx="75" cy="80" r="5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />
          <circle cx="125" cy="80" r="5" fill="#94a3b8" stroke="#1e293b" strokeWidth="1" />

          {/* Lower Turret Housing */}
          <path d="M 50 60 L 60 -10 L 140 -10 L 150 60 Z" fill="url(#metalBase)" stroke="#64748b" strokeWidth="2" />
          <rect x="75" y="10" width="50" height="30" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <rect x="90" y="20" width="20" height="10" rx="2" fill="#0E79B2" opacity="0.8" />
        </g>

        {/* Articulated Shoulder Assembly */}
        <g className="animate-shoulder" transform="translate(150, 500)">
          {/* Shoulder Joint Hub */}
          <circle cx="50" cy="20" r="35" fill="url(#metalBase)" stroke="#475569" strokeWidth="3" />
          <circle cx="50" cy="20" r="15" fill="#f97316" stroke="#c2410c" strokeWidth="2" />

          {/* Lower Arm Segment */}
          <g transform="rotate(-15)">
            <path
              d="M 30 10 L 40 -180 L 70 -180 L 70 10 Z"
              fill="url(#metalArm)"
              stroke="#475569"
              strokeWidth="2"
            />
            {/* Structural Industrial Ribs & Warning Stripe */}
            <rect x="44" y="-140" width="12" height="100" rx="2" fill="#1e293b" />
            <path d="M 44 -80 L 56 -70 L 44 -60 Z" fill="#f97316" />
            <path d="M 44 -110 L 56 -100 L 44 -90 Z" fill="#f97316" />

            {/* Hydraulic Cylinder */}
            <rect x="25" y="-120" width="10" height="90" rx="3" fill="url(#hydraulicPiston)" />
            <rect x="28" y="-150" width="4" height="50" fill="#cbd5e1" />

            {/* Articulated Elbow Assembly */}
            <g className="animate-elbow" transform="translate(55, -180)">
              <circle cx="0" cy="0" r="28" fill="url(#metalBase)" stroke="#475569" strokeWidth="2" />
              <circle cx="0" cy="0" r="10" fill="#38bdf8" />

              {/* Forearm Segment */}
              <g transform="rotate(35)">
                <path
                  d="M -15 -10 L -5 -160 L 20 -160 L 15 -10 Z"
                  fill="url(#metalArm)"
                  stroke="#475569"
                  strokeWidth="2"
                />
                <rect x="-3" y="-130" width="12" height="90" rx="2" fill="#1e293b" />
                <rect x="-2" y="-100" width="10" height="20" fill="url(#accentOrange)" rx="2" />

                {/* Wrist Joint & End Effector */}
                <g className="animate-wrist" transform="translate(5, -160)">
                  <circle cx="0" cy="0" r="22" fill="url(#metalBase)" stroke="#475569" strokeWidth="2" />
                  
                  {/* Precision Robotic Gripper / Welding Torch */}
                  <path d="M -8 0 L -15 -50 L 15 -50 L 8 0 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
                  <rect x="-4" y="-70" width="8" height="25" rx="2" fill="url(#hydraulicPiston)" />
                  
                  {/* Laser / Welding Nozzle */}
                  <path d="M -3 -70 L 0 -95 L 3 -70 Z" fill="#f97316" />

                  {/* Pulsing Precision Welding Arc / Laser Beam */}
                  <g className="animate-weld" transform="translate(0, -95)">
                    <circle cx="0" cy="0" r="14" fill="#38bdf8" opacity="0.6" filter="url(#glow)" />
                    <circle cx="0" cy="0" r="6" fill="#ffffff" />
                    {/* Simulated sparks */}
                    <path d="M 0 0 L -15 -15 M 0 0 L 18 -12 M 0 0 L 5 22 M 0 0 L -12 14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M 0 0 L 12 -25 M 0 0 L -22 -8" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Subtle Robotic Telemetry Grid Lines */}
        <g stroke="#0E79B2" strokeWidth="0.75" opacity="0.25" strokeDasharray="4 4">
          <line x1="50" y1="200" x2="180" y2="200" />
          <line x1="180" y1="200" x2="220" y2="250" />
          <circle cx="220" cy="250" r="4" fill="#0E79B2" />
        </g>
      </svg>
    </div>
  );
};
export default IndustrialRoboticArm;
