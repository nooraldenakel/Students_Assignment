import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: { label: string; value: string }[];
    className?: string;
    disabled?: boolean;
    placement?: 'bottom' | 'top';
}

export default function Dropdown({ value, onChange, options, className = '', disabled = false, placement = 'bottom' }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className={`relative inline-block text-left w-full ${className}`} ref={containerRef}>
            <button
                type="button"
                disabled={disabled}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2 bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">{selectedLabel}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? (placement === 'top' ? '-rotate-180' : 'rotate-180') : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 min-w-full w-max bg-white border border-border rounded-lg shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col right-0 sm:right-auto ${placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
                    <ul className="max-h-[240px] overflow-y-auto w-full py-1">
                        {options.map((option) => (
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
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
