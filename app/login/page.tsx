'use client';

import { useState } from 'react';
import { useStore } from '../../lib/store';
import { useRouter } from 'next/navigation';
import {
    Lock,
    Mail,
    BarChart3,
    Users,
    LayoutDashboard,
    TrendingUp,
    CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useStore((state) => state.login);
    const showAlert = useStore((state) => state.showAlert);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const success = login(email, password);

        if (success) {
            router.push('/');
        } else {
            showAlert('Login Failed', 'Invalid email or password. Please try again.', 'error');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            <style jsx>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes float-medium {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes float-fast {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                
                .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
                .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
                .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
                .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
                .animation-delay-200 { animation-delay: 200ms; }
                .animation-delay-400 { animation-delay: 400ms; }
                
                .glass-card {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                }
            `}</style>

            {/* Left Box: Login Form */}
            <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-20 animate-fade-in-up relative z-10">
                <div className="max-w-md w-full mx-auto">
                    {/* Brand / Logo Area */}
                    <div className="mb-10 flex items-center gap-3">
                        <div className="relative flex items-center justify-center">
                            <img
                                src="https://play-lh.googleusercontent.com/ohAHv0XsLoev0RZgIy9jFwuLAxRthpwfCGZVzjE6-ZNI11m0qptxBFDpUEOvKvlL-_Lg4bojhl-MgPZZGYdIArk"
                                alt="EduManager Logo"
                                className="w-12 h-12 object-contain rounded-md"
                            />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 ml-2">
                            EduManager System
                        </span>
                    </div>

                    <div className="mb-10">
                        <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Please enter your details to sign in directly.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email <span className="text-rose-500">*</span></label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-sm font-bold text-slate-700">Password <span className="text-rose-500">*</span></label>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-[0_10px_20px_-10px_rgba(79,70,229,0.5)] hover:shadow-[0_15px_25px_-10px_rgba(79,70,229,0.6)] hover:-translate-y-[1px] transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none disabled:transform-none mt-2"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center space-y-3">
                        <p className="text-xs font-semibold text-slate-400">
                            Strictly for authorized institutional personnel.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                            <span>Design and Developed by Alayan University</span>
                            <img
                                src="https://play-lh.googleusercontent.com/ohAHv0XsLoev0RZgIy9jFwuLAxRthpwfCGZVzjE6-ZNI11m0qptxBFDpUEOvKvlL-_Lg4bojhl-MgPZZGYdIArk"
                                alt="Alayan University Logo"
                                className="w-5 h-5 object-contain opacity-80 rounded-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Box: Hero Graphic / Gradient */}
            <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 overflow-hidden items-center justify-center p-20">
                {/* Background decorative circles */}
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/10 blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/40 blur-[100px]" />

                {/* Main Glass Panel Graphic Container */}
                <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">

                    {/* The primary central glass panel */}
                    <div className="absolute inset-0 m-auto w-[80%] h-[75%] glass-card rounded-3xl shadow-2xl flex flex-col p-8 animate-fade-in-up border-t-white/40 border-l-white/40">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-rose-400" />
                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                            </div>
                            <div className="h-6 w-24 bg-white/20 rounded-full" />
                        </div>

                        {/* Faux UI bars */}
                        <div className="space-y-6 flex-1">
                            <div className="flex items-end gap-3 h-full pb-4">
                                <div className="w-1/6 bg-white/40 rounded-t-lg h-[40%]" />
                                <div className="w-1/6 bg-white/60 rounded-t-lg h-[70%]" />
                                <div className="w-1/6 bg-white/30 rounded-t-lg h-[30%]" />
                                <div className="w-1/6 bg-indigo-300 rounded-t-lg h-[85%]" />
                                <div className="w-1/6 bg-white/50 rounded-t-lg h-[50%]" />
                                <div className="w-1/6 bg-white/20 rounded-t-lg h-[60%]" />
                            </div>
                            <div className="h-4 w-1/3 bg-white/30 rounded-full" />
                            <div className="h-3 w-1/2 bg-white/20 rounded-full" />
                        </div>
                    </div>

                    {/* Floating Element 1 - Top Left */}
                    <div className="absolute top-[5%] left-[0%] w-64 glass-card rounded-2xl p-5 shadow-2xl animate-float-medium z-20 border-t-white/40 border-l-white/40 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-400 text-white flex items-center justify-center shadow-lg">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white/80 text-sm font-medium">Total Students</p>
                                <p className="text-white text-2xl font-bold font-mono">14,892</p>
                            </div>
                        </div>
                    </div>

                    {/* Floating Element 2 - Bottom Right */}
                    <div className="absolute bottom-[10%] right-[-5%] w-72 glass-card rounded-2xl p-5 shadow-2xl animate-float-slow z-20 border-t-white/40 border-l-white/40 backdrop-blur-xl">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Real-time Syncing</p>
                                <p className="text-white/70 text-xs text-green-100">+ Active Database Data</p>
                            </div>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-[85%] bg-emerald-400 rounded-full" />
                        </div>
                    </div>

                    {/* Floating Element 3 - Top Right (Small notification) */}
                    <div className="absolute top-[20%] right-[5%] glass-card rounded-full px-4 py-2 shadow-xl animate-float-fast z-20 flex items-center gap-2 border-t-white/40">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-white text-xs font-semibold">Assignment Generated</span>
                    </div>

                </div>
            </div>
        </div>
    );
}
