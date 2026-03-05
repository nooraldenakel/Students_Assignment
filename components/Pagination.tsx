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

    // Adjust current page if it's out of bounds after a filter or size change
    React.useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            onPageChange(totalPages);
        }
    }, [currentPage, totalPages, onPageChange]);

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

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-border w-full gap-4 relative z-20" style={{ borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
                <span className="font-medium whitespace-nowrap">Show:</span>
                <div className="w-[110px]">
                    <Dropdown
                        value={displaySizeValue}
                        onChange={handlePageSizeChange}
                        placement="top"
                        options={[
                            { label: '10', value: '10' },
                            { label: '20', value: '20' },
                            { label: '30', value: '30' },
                            { label: '50', value: '50' },
                            { label: '75', value: '75' },
                            { label: '100', value: '100' },
                            { label: '200', value: '200' },
                            { label: 'All', value: 'All' },
                            { label: 'Custom...', value: 'Custom' }
                        ]}
                    />
                </div>

                {isCustom && (
                    <form onSubmit={handleCustomSizeSubmit} className="flex gap-1 items-center ml-2">
                        <input
                            type="number"
                            min="1"
                            value={customSize}
                            onChange={(e) => setCustomSize(e.target.value)}
                            placeholder="Qty"
                            className="w-16 border border-border rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        />
                        <button type="submit" className="text-xs bg-primary text-white px-2 py-1 rounded hover:bg-primary/90">
                            Set
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

                <span className="text-sm font-medium text-foreground px-2">
                    Page {currentPage} of {totalPages}
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
