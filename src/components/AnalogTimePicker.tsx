import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as PopoverPrimitive from "@radix-ui/react-popover@1.1.6";
import { cn } from './ui/utils';
import { Clock } from 'lucide-react';

interface AnalogTimePickerProps {
  value: string; // HH:mm
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function AnalogTimePicker({ value, onChange, label, className }: AnalogTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');
  
  // Parse initial value
  const [h24, m] = value.split(':').map(Number);
  const initialPeriod = h24 >= 12 ? 'PM' : 'AM';
  const initialHour = h24 % 12 || 12;
  
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(m || 0);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialPeriod);
  
  const clockRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop value when it changes externally
  useEffect(() => {
    const [nh24, nm] = value.split(':').map(Number);
    setHour(nh24 % 12 || 12);
    setMinute(nm || 0);
    setPeriod(nh24 >= 12 ? 'PM' : 'AM');
  }, [value]);

  const handleUpdate = useCallback((newHour: number, newMin: number, newPeriod: 'AM' | 'PM') => {
    let h = newHour;
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    
    const formatted = `${String(h).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
    onChange(formatted);
  }, [onChange]);

  const handleMouseInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!clockRef.current) return;
    
    const rect = clockRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    // Calculate angle in degrees (0 is top)
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    if (mode === 'hour') {
      const h = Math.round(angle / 30) || 12;
      setHour(h > 12 ? h - 12 : h);
      // Switch to minute mode after a short delay or on mouse up
    } else {
      let min = Math.round(angle / 6);
      if (min === 60) min = 0;
      setMinute(min);
    }
  };

  const handleInteractionEnd = () => {
    // Removed automatic switching to minute mode to allow manual control.
    handleUpdate(hour, minute, period);
  };

  const hourAngle = (hour % 12) * 30;
  const minuteAngle = minute * 6;

  return (
    <div className={cn("relative", className)}>
      {label && <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">{label}</label>}
      
      <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button 
            className="w-full flex items-center justify-between px-4 py-2 bg-white border border-[#E2E8F0] rounded-xl hover:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-normal text-slate-700"
          >
            <span>{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content 
            sideOffset={8}
            className="z-50 w-72 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 p-6 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header / Selection Display */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <button 
                onClick={() => setMode('hour')}
                className={cn(
                  "text-4xl font-black transition-colors",
                  mode === 'hour' ? "text-blue-600" : "text-slate-300"
                )}
              >
                {String(hour).padStart(2, '0')}
              </button>
              <span className="text-4xl font-black text-slate-200">:</span>
              <button 
                onClick={() => setMode('minute')}
                className={cn(
                  "text-4xl font-black transition-colors",
                  mode === 'minute' ? "text-blue-600" : "text-slate-300"
                )}
              >
                {String(minute).padStart(2, '0')}
              </button>
              
              <div className="ml-4 flex flex-col gap-1">
                <button 
                  onClick={() => { setPeriod('AM'); handleUpdate(hour, minute, 'AM'); }}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-black transition-all",
                    period === 'AM' ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400"
                  )}
                >
                  AM
                </button>
                <button 
                  onClick={() => { setPeriod('PM'); handleUpdate(hour, minute, 'PM'); }}
                  className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-black transition-all",
                    period === 'PM' ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-400"
                  )}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Clock Face */}
            <div 
              ref={clockRef}
              className="relative w-full aspect-square bg-slate-50 rounded-full border border-slate-100/50 flex items-center justify-center touch-none select-none cursor-pointer"
              onMouseDown={(e) => { handleMouseInteraction(e); }}
              onTouchStart={(e) => { handleMouseInteraction(e); }}
              onMouseMove={(e) => { if (e.buttons === 1) handleMouseInteraction(e); }}
              onTouchMove={(e) => { handleMouseInteraction(e); }}
              onMouseUp={handleInteractionEnd}
              onTouchEnd={handleInteractionEnd}
            >
              {/* Center Dot */}
              <div className="absolute w-2 h-2 bg-blue-600 rounded-full z-20 shadow-lg shadow-blue-200" />
              
              {/* Clock Hand */}
              <div 
                className="absolute origin-bottom z-10 transition-transform duration-200 ease-out"
                style={{ 
                  height: '40%', 
                  width: '2px', 
                  backgroundColor: 'var(--color-primary, #2563eb)', 
                  bottom: '50%',
                  transform: `rotate(${mode === 'hour' ? hourAngle : minuteAngle}deg)` 
                }}
              >
                {/* Hand End Circle */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 shadow-xl shadow-blue-200 flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              </div>

              {/* Numbers */}
              {Array.from({ length: 12 }).map((_, i) => {
                const val = mode === 'hour' ? (i === 0 ? 12 : i) : (i * 5);
                const angle = i * 30;
                const rad = (angle - 90) * (Math.PI / 180);
                const r = 38; // percentage radius
                
                const isSelected = mode === 'hour' ? hour === val : (minute === val || (minute % 5 !== 0 && i === Math.floor(minute/5)));

                return (
                  <div 
                    key={i}
                    className={cn(
                      "absolute -translate-x-1/2 -translate-y-1/2 text-sm transition-all duration-300",
                      isSelected ? "text-white font-black scale-110" : "text-slate-400 font-medium"
                    )}
                    style={{ 
                      left: `${50 + r * Math.cos(rad)}%`,
                      top: `${50 + r * Math.sin(rad)}%` 
                    }}
                  >
                    {mode === 'hour' ? val : String(val).padStart(2, '0')}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
