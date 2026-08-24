import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Dropdown from './Dropdown';

type PageSizeOption = 10 | 20 | 30 | 50 | 75 | 100 | 200 | 'All' | 'Custom';

interface PaginationProps {
    currentPage: number;
    totalItems: number;
    pageSize: number | 'All';
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number | 'All') => void;
}

export default function Pagination({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange
}: PaginationProps) {
    const [customSize, setCustomSize] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);

    const actualPageSize = pageSize === 'All' ? totalItems : pageSize;
    const totalPages = actualPageSize > 0 ? Math.ceil(totalItems / actualPageSize) : 1;

    const PRESET_PAGE_SIZES = [10, 20, 30, 50, 75, 100, 200];

    // Only allow page sizes if total items is at least that size (always keeping 10 as minimum)
    const availableSizes = PRESET_PAGE_SIZES.filter(s => s === 10 || totalItems >= s);

    // Adjust current page if it's out of bounds after a filter or size change
    React.useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            onPageChange(totalPages);
        }
    }, [currentPage, totalPages, onPageChange]);

    // If current numeric pageSize exceeds total items and is > 10, adjust to the highest valid size
    React.useEffect(() => {
        if (typeof pageSize === 'number' && pageSize > 10 && pageSize > totalItems) {
            const validSizes = PRESET_PAGE_SIZES.filter(s => s === 10 || totalItems >= s);
            const fallback = validSizes[validSizes.length - 1] || 10;
            onPageSizeChange(fallback);
        }
    }, [totalItems, pageSize, onPageSizeChange]);

    if (totalItems === 0) {
        return null; // hide or invisible if no students
    }

    const handlePageSizeChange = (val: string) => {
        if (val === 'Custom') {
            setIsCustom(true);
            setCustomSize('');
        } else if (val === 'All') {
            setIsCustom(false);
            onPageSizeChange('All');
        } else {
            setIsCustom(false);
            onPageSizeChange(parseInt(val, 10));
        }
        onPageChange(1); // reset to page 1 on size change
    };

    const handleCustomSizeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseInt(customSize, 10);
        if (!isNaN(parsed) && parsed > 0) {
            onPageSizeChange(parsed);
            onPageChange(1);
        }
    };

    const displaySizeValue = isCustom ? 'Custom' : (pageSize === 'All' ? 'All' : pageSize.toString());

    const dropdownOptions = [
        ...availableSizes.map(s => ({ label: s.toString(), value: s.toString() })),
        { label: 'الكل', value: 'All' },
        { label: 'مخصص...', value: 'Custom' }
    ];

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-border w-full gap-4 relative z-20" style={{ borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">عرض:</span>
                <div className="w-[110px]">
                    <Dropdown
                        value={displaySizeValue}
                        onChange={handlePageSizeChange}
                        placement="top"
                        options={dropdownOptions}
                    />
                </div>

                {isCustom && (
                    <form onSubmit={handleCustomSizeSubmit} className="flex gap-1 items-center ml-2">
                        <input
                            type="number"
                            min="1"
                            value={customSize}
                            onChange={(e) => setCustomSize(e.target.value)}
                            placeholder="الكمية"
                            className="w-16 border border-border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                        <button type="submit" className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/90">
                            تعيين
                        </button>
                    </form>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>

                <span className="text-sm font-medium text-muted-foreground">
                صفحة <strong className="text-foreground">{currentPage}</strong> من <strong className="text-foreground">{totalPages}</strong>
                <span className="hidden sm:inline"> ({totalItems} عناصر إجمالية)</span>
            </span>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
            </div>

            <div className="text-sm text-muted-foreground font-medium min-w-[120px] text-right">
                {totalItems} total items
            </div>
        </div>
    );
}
