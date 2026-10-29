import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-9 h-9" }) => {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <img
        src="/assets/aistudio/image_a7cbb32d.png"
        alt="FactoryOps Logo"
        className="w-full h-full object-contain drop-shadow-xs"
      />
    </div>
  );
};
