'use client';

import { useState } from 'react';
import { useStore, Role } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { Lock, User as UserIcon } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-muted p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-border p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
                    <p className="text-sm text-muted-foreground mt-2">Sign in to manage student lists</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@edu.com"
                            className="w-full px-4 py-3 rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-70 mt-4"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-xs text-muted-foreground">
                    <p>Enter your institutional credentials to continue.</p>
                </div>
            </div>
        </div>
    );
}
