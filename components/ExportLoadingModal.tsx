'use client';

import React from 'react';
import { Loader2, Download, FileSpreadsheet } from 'lucide-react';

interface ExportLoadingModalProps {
    isOpen: boolean;
    title?: string;
    status?: string;
}

export default function ExportLoadingModal({
    isOpen,
    title = 'جاري تصدير البيانات إلى Excel...',
    status = 'يرجى الانتظار، جاري تجميع وتنسيق السجلات وتجهيز الملف للتحميل...'
}: ExportLoadingModalProps) {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md transition-all duration-300 pointer-events-auto select-none"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] border border-slate-100 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Decorative Top Accent Gradient */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-emerald-500 to-indigo-600 animate-pulse" />

                {/* Animated Spinner Icon Stack */}
                <div className="relative mb-6 flex items-center justify-center mt-2">
                    {/* Glowing pulse aura */}
                    <div className="absolute w-24 h-24 rounded-full bg-indigo-500/15 animate-ping opacity-75" />
                    
                    {/* Outer gradient rotating ring */}
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center" />
                    
                    {/* Center Icon badge */}
                    <div className="absolute w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                        <FileSpreadsheet className="w-6 h-6 animate-pulse text-white" />
                    </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">
                    {title}
                </h3>
                <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-xs mb-6">
                    {status}
                </p>

                {/* Smooth Animated Loading Progress Indicator */}
                <div className="w-56 h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                    <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 rounded-full animate-progress-flow" />
                </div>

                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    <span>عملية التصدير قيد التنفيذ، يرجى عدم إغلاق الصفحة</span>
                </div>
            </div>
        </div>
    );
}
