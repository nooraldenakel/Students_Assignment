'use client';

import { useStore } from '../lib/store';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Modal() {
    const { alert, hideAlert } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !alert.isOpen) return null;

    const Icon = {
        info: Info,
        error: AlertCircle,
        success: CheckCircle2,
        confirm: HelpCircle
    }[alert.type];

    const colors = {
        info: 'text-blue-600 bg-blue-50 border-blue-100',
        error: 'text-red-600 bg-red-50 border-red-100',
        success: 'text-green-600 bg-green-50 border-green-100',
        confirm: 'text-amber-600 bg-amber-50 border-amber-100'
    }[alert.type];

    const btnColors = {
        info: 'bg-blue-600 hover:bg-blue-700',
        error: 'bg-red-600 hover:bg-red-700',
        success: 'bg-green-600 hover:bg-green-700',
        confirm: 'bg-amber-600 hover:bg-amber-700'
    }[alert.type];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl border ${colors}`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <button onClick={hideAlert} className="p-2 hover:bg-muted rounded-xl transition-colors">
                            <X className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    <h3 className="text-xl font-black text-foreground mb-2">{alert.title}</h3>
                    <p className="text-muted-foreground font-medium leading-relaxed">{alert.message}</p>
                </div>

                <div className="p-6 bg-muted/30 border-t border-border flex gap-3">
                    {alert.type === 'confirm' ? (
                        <>
                            <button
                                onClick={hideAlert}
                                className="flex-1 px-6 py-3 rounded-2xl border border-border bg-white font-bold text-foreground hover:bg-muted transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert.onConfirm?.();
                                    hideAlert();
                                }}
                                className={`flex-1 px-6 py-3 rounded-2xl ${btnColors} font-bold text-white shadow-lg shadow-amber-200 transition-all active:scale-95`}
                            >
                                Confirm
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={hideAlert}
                            className={`w-full px-6 py-3 rounded-2xl ${btnColors} font-bold text-white shadow-lg transition-all active:scale-95`}
                        >
                            Understood
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
