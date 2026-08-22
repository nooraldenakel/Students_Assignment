import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { normalizeArabic } from '../lib/store';

interface DropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    className?: string;
    disabled?: boolean;
    placement?: 'bottom' | 'top';
    searchable?: boolean;
    placeholder?: string;
    hasError?: boolean;
}

export default function Dropdown({ value, onChange, options, className = '', disabled = false, placement = 'bottom', searchable = false, placeholder = '', hasError = false }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Reset search query when dropdown opens
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            if (searchable) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
        }
    }, [isOpen, searchable]);

    const selectedOption = options.find(o => o.value === value);
    const selectedLabel = selectedOption ? selectedOption.label : (value || placeholder || '');

    const cleanedQuery = normalizeArabic(searchQuery);
    const filteredOptions = searchable
        ? options.filter(o => !cleanedQuery || normalizeArabic(o.label || '').includes(cleanedQuery))
        : options;

    return (
        <div className={`relative inline-block text-left w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium transition-all ${
                    hasError
                        ? 'border-red-500 bg-red-50/10 ring-2 ring-red-500/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`truncate ${!value && placeholder ? 'text-slate-400 font-normal' : 'text-slate-800 font-medium'}`}>
                    {selectedLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? (placement === 'top' ? '-rotate-180' : 'rotate-180') : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 min-w-full w-max bg-white border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col right-0 sm:right-auto ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                    {searchable && (
                        <div className="p-2 border-b border-border">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-foreground"
                                    placeholder="البحث..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    <ul className="max-h-[240px] overflow-y-auto w-full py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-blue-50 hover:text-primary ${option.value === value ? 'bg-primary/5 text-primary font-semibold' : 'text-foreground font-medium'}`}
                                        onClick={() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-sm text-muted-foreground text-center">لا توجد نتائج</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
