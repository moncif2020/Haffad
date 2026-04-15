import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  className?: string;
}

export function CustomSelect({ value, onChange, options, className = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${isOpen ? 'z-[1000]' : 'z-10'}`} ref={dropdownRef}>
      <div 
        className={`flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer select-none transition-all ${isOpen ? 'ring-2 ring-emerald-500 border-transparent bg-white shadow-sm' : ''} ${className}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-slate-700 font-medium truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[1001] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[60vh] overflow-y-auto animate-in fade-in zoom-in duration-200 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {options.map((option) => (
            <button
              key={option.value}
              className={`w-full text-start p-4 cursor-pointer hover:bg-emerald-50 transition-colors ${value === option.value ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-700'}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
