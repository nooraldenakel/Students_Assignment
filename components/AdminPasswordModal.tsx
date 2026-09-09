'use client';

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title?: string;
    description?: string;
    confirmButtonText?: string;
    currentUserEmail?: string;
}

export default function AdminPasswordModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'تأكيد مسح المباشرات',
    description = 'هذا الإجراء حساس ولا يمكن التراجع عنه. يرجى إدخال كلمة مرور حساب المدير (Admin) للمتابعة:',
    confirmButtonText = 'تأكيد ومسح المباشرات',
    currentUserEmail
}: AdminPasswordModalProps) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleClose = () => {
        setPassword('');
        setErrorMsg('');
        setIsLoading(false);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!password) {
            setErrorMsg('يرجى إدخال كلمة المرور.');
            return;
        }

        if (!currentUserEmail) {
            setErrorMsg('لم يتم التعرف على البريد الإلكتروني لحسابك.');
            return;
        }

        setIsLoading(true);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: currentUserEmail,
                password: password
            });

            if (authError) {
                setErrorMsg('كلمة المرور غير صحيحة، يرجى التأكد وإعادة المحاولة.');
                setIsLoading(false);
                return;
            }

            // Password is correct!
            await onConfirm();
            handleClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'حدث خطأ أثناء التحقق من كلمة المرور.');
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md transition-all duration-300 pointer-events-auto"
            dir="rtl"
            role="dialog"
            aria-modal="true"
        >
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-100 flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Danger Red Accent Bar */}
                <div className="h-1.5 bg-gradient-to-r from-rose-500 via-red-600 to-rose-500" />

                {/* Header */}
                <div className="p-6 pb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                                {title}
                            </h3>
                            <p className="text-xs text-rose-600 font-bold mt-0.5">
                                إجراء إداري محمي بكلمة المرور
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isLoading}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Description */}
                <div className="px-6 py-2">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-700">كلمة مرور المدير (Admin Password)</label>
                        <div className="relative">
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <KeyRound className="w-4 h-4" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="أدخل كلمة مرور حسابك"
                                autoFocus
                                disabled={isLoading}
                                className={`w-full pr-10 pl-10 py-3 rounded-2xl border text-sm font-bold outline-none transition-all ${
                                    errorMsg
                                        ? 'border-rose-400 bg-rose-50/30 focus:ring-4 focus:ring-rose-500/10'
                                        : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10'
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {errorMsg && (
                            <p className="text-xs font-bold text-rose-600 mt-1 animate-in fade-in duration-150">
                                {errorMsg}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all"
                        >
                            إلغاء
                        </button>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-[0_4px_12px_-2px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_16px_-2px_rgba(225,29,72,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>{isLoading ? 'جاري التحقق...' : confirmButtonText}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
