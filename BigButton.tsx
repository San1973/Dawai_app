
import React from 'react';

interface BigButtonProps {
  onClick: () => void;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  primary?: boolean;
  className?: string;
  disabled?: boolean;
}

export const BigButton: React.FC<BigButtonProps> = ({ 
  onClick, 
  label, 
  subLabel, 
  icon, 
  primary = false, 
  className = "",
  disabled = false
}) => {
  const baseClasses = "w-full flex flex-col items-center justify-center p-6 rounded-2xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border-2";
  
  // Dark mode optimized color classes
  const colorClasses = primary 
    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-orange-950/40 border-orange-400/50" 
    : "bg-slate-900 text-slate-200 hover:bg-slate-800 border-slate-800 hover:border-slate-700";

  return (
    <button 
      onClick={onClick} 
      className={`${baseClasses} ${colorClasses} ${className}`}
      disabled={disabled}
    >
      {icon && <div className="mb-2 text-4xl filter drop-shadow-sm">{icon}</div>}
      <span className="text-xl font-bold text-center leading-tight tracking-wide">{label}</span>
      {subLabel && <span className="text-base opacity-90 mt-1 font-medium">{subLabel}</span>}
    </button>
  );
};
