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
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

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

  // Ensure focused item is visible (important for TV)
  const handleFocus = (index: number) => {
    optionsRef.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[1000]' : 'z-10'}`} ref={dropdownRef}>
      <div 
        tabIndex={0}
        role="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
        className={`flex items-center justify-between w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer select-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isOpen ? 'ring-2 ring-emerald-500 border-transparent bg-white shadow-sm' : ''} ${className}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
          if (e.key === 'Escape') setIsOpen(false);
        }}
      >
        <span className="text-slate-700 font-medium truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[1001] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-[40vh] overflow-y-auto animate-in fade-in zoom-in duration-200 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          {options.map((option, idx) => (
            <button
              key={option.value}
              ref={el => optionsRef.current[idx] = el}
              onFocus={() => handleFocus(idx)}
              className={`w-full text-start p-4 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none transition-colors ${value === option.value ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-700'}`}
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
