import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CalendarPickerProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  className?: string;
  inline?: boolean;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  value,
  onChange,
  label,
  className = '',
  inline = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsedDate.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedDate.getMonth() ?? new Date().getMonth());

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate months
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate days in month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Helper for quick presets
  const setPreset = (preset: 'today' | 'yesterday' | '1m' | '6m' | '1y') => {
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    } else if (preset === '1m') {
      d.setMonth(d.getMonth() - 1);
    } else if (preset === '6m') {
      d.setMonth(d.getMonth() - 6);
    } else if (preset === '1y') {
      d.setFullYear(d.getFullYear() - 1);
    }
    const iso = d.toISOString().slice(0, 10);
    onChange(iso);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const selectedIso = `${viewYear}-${mm}-${dd}`;
    onChange(selectedIso);
    setIsOpen(false);
  };

  // Format display text
  const formattedDisplay = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Select Date';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button & Input */}
      <div className="flex items-center gap-1.5">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono cursor-pointer hover:border-indigo-500 transition focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold">{formattedDisplay}</span>
            {value && <span className="text-[10px] text-slate-500 dark:text-slate-400">({value})</span>}
          </div>
          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">
            {isOpen ? 'Close' : 'Calendar'}
          </span>
        </div>

        {/* Hidden native input with showPicker fallback */}
        <input
          type="date"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value) {
              const d = new Date(e.target.value + 'T00:00:00');
              setViewYear(d.getFullYear());
              setViewMonth(d.getMonth());
            }
          }}
          className="w-8 h-8 p-1 opacity-0 absolute pointer-events-none"
          tabIndex={-1}
        />
      </div>

      {/* Interactive Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-1.5 left-0 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 p-3.5 animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Header Month / Year controls */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-2 py-1 rounded border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-2 py-1 rounded border border-slate-200 dark:border-slate-700 focus:outline-none font-mono cursor-pointer"
              >
                {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - 15 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday abbreviations */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-mono font-bold text-slate-400">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="p-1.5" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(day).padStart(2, '0');
              const currentIso = `${viewYear}-${mm}-${dd}`;
              const isSelected = value === currentIso;
              const isToday = new Date().toISOString().slice(0, 10) === currentIso;

              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`p-1.5 rounded transition cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : isToday
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Presets Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
            <span className="text-slate-400 uppercase text-[9px] font-bold">Presets:</span>
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setPreset('today')}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setPreset('yesterday')}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => setPreset('1m')}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                1M
              </button>
              <button
                type="button"
                onClick={() => setPreset('6m')}
                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                6M
              </button>
              <button
                type="button"
                onClick={() => setPreset('1y')}
                className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold cursor-pointer"
              >
                1Y (LTCG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
