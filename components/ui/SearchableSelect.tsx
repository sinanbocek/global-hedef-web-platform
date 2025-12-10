import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight } from 'lucide-react';

export interface SearchableSelectProps {
    options: { value: string; label: string; subLabel?: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, icon, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    // Filter options
    const filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.includes(search))
    );

    const selectedOption = options.find(o => o.value === value);

    return (
        <div className={`relative ${className || ''}`} ref={wrapperRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all cursor-pointer flex items-center justify-between"
            >
                <span className={selectedOption ? 'text-slate-800 dark:text-white' : 'text-slate-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                {icon ? icon : <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />}
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
                            <input
                                autoFocus
                                type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand-primary"
                                placeholder="Ara..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    {filtered.length > 0 ? (
                        filtered.map(opt => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex flex-col ${value === opt.value ? 'bg-blue-50 dark:bg-blue-900/20 text-brand-primary' : 'text-slate-700 dark:text-slate-200'}`}
                            >
                                <span className="font-medium">{opt.label}</span>
                                {opt.subLabel && <span className="text-xs text-slate-400">{opt.subLabel}</span>}
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-xs text-slate-400">Sonuç bulunamadı.</div>
                    )}
                </div>
            )}
        </div>
    );
};
