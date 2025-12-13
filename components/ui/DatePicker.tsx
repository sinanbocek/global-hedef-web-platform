import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Tarih seçin', className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // For navigation
    const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; width?: number; }>({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Initialize viewDate from value if present
    useEffect(() => {
        if (value) {
            // Manual parsing to ensure Local Midnight logic (avoid UTC offsets)
            const parts = value.split('-');
            if (parts.length === 3) {
                const y = parseInt(parts[0]);
                const m = parseInt(parts[1]) - 1; // 0-indexed
                const d = parseInt(parts[2]);
                const date = new Date(y, m, d);
                // Validate
                if (!isNaN(date.getTime()) && date.getDate() === d) {
                    setViewDate(date);
                    return;
                }
            }

            // Fallback for other formats (ISO with time etc)
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setViewDate(date);
            }
        }
    }, [isOpen, value]); // Reset view when opening or value changes externally

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Default: bottom-left aligned
            let top = rect.bottom + window.scrollY + 8;
            let left = rect.left + window.scrollX;

            // Check overflow right (simple check)
            if (left + 280 > window.innerWidth) {
                left = rect.right - 280 + window.scrollX; // Align right edge
            }

            // Check overflow bottom - flip up if needed
            // (Ignoring for simplicity unless requested, usually down is fine or portal handles z-index)

            setPopoverStyle({
                top,
                left,
                // width: rect.width // Optional: match width? Calendar usually fixed min-width
            });
        }
    }, [isOpen]);

    // Handle scroll/resize to update position or close?
    useEffect(() => {
        const handleUpdate = () => {
            if (isOpen) setIsOpen(false); // Simplest: close on scroll/resize to avoid floating detachment
        };
        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true); // Capture scroll to catch modal scrolls
        return () => {
            window.removeEventListener('resize', handleUpdate);
            window.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen]);

    // Click outside to close (handles both input container and portal popover)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Check if click is inside container (input)
            const isClickInsideContainer = containerRef.current?.contains(event.target as Node);
            // Check if click is inside popover (portal)
            const isClickInsidePopover = popoverRef.current?.contains(event.target as Node);

            if (!isClickInsideContainer && !isClickInsidePopover) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Convert Sun=0 to Mon=0 (TR standard)
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setViewDate(newDate);
    };

    const handleSelectDate = (day: number) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Format to YYYY-MM-DD manually to avoid timezone issues
        const year = selected.getFullYear();
        const month = String(selected.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        onChange(dateStr);
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(today.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${dayStr}`);
        setViewDate(today);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    // Generate calendar grid
    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    const days = [];

    // Empty slots for start of month
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-7 w-7" />);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = value === currentDateStr;
        const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();

        days.push(
            <button
                key={day}
                onClick={() => handleSelectDate(day)}
                className={`
                    h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                    ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}
                    ${!isSelected && isToday ? 'text-blue-600 font-bold' : ''}
                `}
            >
                {day}
            </button>
        );
    }

    // Check if valid date
    const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

    // Manual input handling
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;

        // Remove non-digit/non-dot chars
        val = val.replace(/[^\d.]/g, '');

        // Auto-add dots logic (simple)
        if (val.length === 8 && !val.includes('.')) {
            // 01012025 -> 01.01.2025
            const d = val.substring(0, 2);
            const m = val.substring(2, 4);
            const y = val.substring(4, 8);
            val = `${d}.${m}.${y}`;
        }

        // Parse DD.MM.YYYY
        const parts = val.split('.');
        if (parts.length === 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1; // Month is 0-indexed
            const y = parseInt(parts[2]);

            // Check if fully typed year (4 digits)
            if (parts[2].length === 4) {
                const date = new Date(y, m, d);
                if (isValidDate(date) && date.getDate() === d && date.getMonth() === m && y > 1900) {
                    // Valid date found from input
                    // Convert to ISO for onChange
                    const isoDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    onChange(isoDate);
                    setViewDate(date);
                    return;
                }
            }
        }

        onChange(val);
    };

    // Format YYYY-MM-DD to DD.MM.YYYY for display
    const formatDateToDisplay = (isoStr: string) => {
        if (!isoStr) return '';

        // Check if manual input (DD.MM.YYYY or partial)
        if (isoStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) return isoStr;

        // Sanitize string (remove spaces just in case)
        const cleanStr = isoStr.trim();

        const date = new Date(cleanStr);
        if (isValidDate(date) && cleanStr.includes('-')) {
            // It is an ISO string (from DB or calendar pick)
            const d = String(date.getDate()).padStart(2, '0');
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const y = date.getFullYear();
            return `${d}.${m}.${y}`;
        }

        // Otherwise return raw string (user typing)
        return isoStr;
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Input Trigger */}
            <div className="relative group">
                <input
                    type="text"
                    value={formatDateToDisplay(value)}
                    onChange={handleInputChange}
                    placeholder={placeholder || "GG.AA.YYYY"}
                    onClick={() => setIsOpen(true)}
                    maxLength={10}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-9 py-2 text-sm text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
                />
                <CalendarIcon
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors pointer-events-none"
                />
            </div>

            {/* Popover via Portal */}
            {isOpen && createPortal(
                <div
                    ref={popoverRef}
                    style={{
                        position: 'absolute',
                        top: popoverStyle.top,
                        left: popoverStyle.left,
                        zIndex: 9999 // High z-index to stay on top
                    }}
                    className="bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.15)] border border-slate-100 p-3 min-w-[260px]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); changeMonth(-1); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="font-bold text-sm text-slate-800">
                            {months[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button
                            onClick={(e) => { e.stopPropagation(); changeMonth(1); }}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-1">
                        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(d => (
                            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-y-1 justify-items-center">
                        {days}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 border-t border-slate-100 pt-2">
                        <button
                            onClick={handleClear}
                            className="text-[10px] font-medium text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded"
                        >
                            Temizle
                        </button>
                        <button
                            onClick={handleToday}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded"
                        >
                            Bugün
                        </button>
                    </div>
                </div>
                , document.body)}
        </div>
    );
};
