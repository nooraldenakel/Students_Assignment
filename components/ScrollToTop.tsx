'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopProps {
    /** The number of items displayed on the current page/view */
    itemsCount: number;
    /** Whether there is another FAB (like Admin Add Student) below this button */
    hasBottomFab?: boolean;
    /** Custom CSS class for positioning or styling */
    className?: string;
}

export default function ScrollToTop({
    itemsCount,
    hasBottomFab = false,
    className = ''
}: ScrollToTopProps) {
    const [isScrolledDown, setIsScrolledDown] = useState(false);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const mainEl = document.querySelector('main');
        if (!mainEl) return;

        const handleScroll = () => {
            const scrollTop = mainEl.scrollTop;
            
            // Only consider scrolled down if scrollTop > 200px
            setIsScrolledDown(scrollTop > 200);
            
            // Fade button while actively scrolling
            setIsScrolling(true);
            
            if (scrollTimerRef.current) {
                clearTimeout(scrollTimerRef.current);
            }
            
            // Reveal button when scrolling stops
            scrollTimerRef.current = setTimeout(() => {
                setIsScrolling(false);
            }, 300);
        };

        mainEl.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            mainEl.removeEventListener('scroll', handleScroll);
            if (scrollTimerRef.current) {
                clearTimeout(scrollTimerRef.current);
            }
        };
    }, []);

    // Only display if there are 30 or more items and user has scrolled down
    const shouldDisplay = itemsCount >= 30 && isScrolledDown;
    const isVisible = shouldDisplay && !isScrolling;

    const handleScrollToTop = () => {
        const mainEl = document.querySelector('main');
        if (mainEl) {
            mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (itemsCount < 30) {
        return null;
    }

    const bottomPosition = hasBottomFab ? 'bottom-24 sm:bottom-24' : 'bottom-8';

    return (
        <div
            className={`fixed ${bottomPosition} right-8 z-40 transition-all duration-300 ease-out ${
                isVisible
                    ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 translate-y-4 scale-75 pointer-events-none'
            } ${className}`}
        >
            <button
                type="button"
                onClick={handleScrollToTop}
                title="الرجوع للأعلى (Scroll to Top)"
                aria-label="الرجوع للأعلى"
                className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(99,102,241,0.7)] ring-4 ring-indigo-500/15 hover:ring-indigo-500/30 transition-all duration-300 transform active:scale-90"
            >
                <div className="flex flex-col items-center justify-center transition-transform duration-300 group-hover:-translate-y-0.5">
                    <ChevronUp className="w-6 h-6 stroke-[2.5] transition-transform duration-200 group-hover:scale-110" />
                </div>

                {/* Subtle Arabic Tooltip on Hover */}
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center px-2.5 py-1 bg-slate-900/90 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-700/60 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200" dir="rtl">
                    الرجوع للأعلى
                    <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-slate-900/90"></div>
                </div>
            </button>
        </div>
    );
}
