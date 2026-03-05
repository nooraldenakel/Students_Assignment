'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../lib/store';
import { Users, List, BarChart, Settings, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Sidebar() {
    const pathname = usePathname();
    const { currentUser, logout } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // Hydration fix

    // Don't show sidebar on login page
    if (pathname === '/login') return null;

    return (
        <aside className="w-64 bg-white border-r border-border h-full flex flex-col">
            <div className="p-6 border-b border-slate-200">
                <h1 className="text-xl font-bold flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                        <Users className="w-5 h-5" />
                    </div>
                    <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700">
                        EduManager
                    </span>
                </h1>
                {currentUser && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all hover:shadow-md hover:border-indigo-100">
                        <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                        <p className="text-xs font-semibold text-indigo-600/80 capitalize mt-0.5">{currentUser.role}</p>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {currentUser?.role !== 'Viewer' && (
                    <NavItem href="/" icon={<Users />} label="Main List" active={pathname === '/'} />
                )}
                <NavItem href="/list/l1" icon={<List />} label="List 1" active={pathname === '/list/l1'} />
                <NavItem href="/list/l2" icon={<List />} label="List 2" active={pathname === '/list/l2'} />
                <NavItem href="/list/l3" icon={<List />} label="List 3" active={pathname === '/list/l3'} />
                <NavItem href="/list/l4" icon={<List />} label="List 4" active={pathname === '/list/l4'} />

                {currentUser?.role === 'Admin' && (
                    <>
                        <div className="my-4 border-t border-border" />
                        <NavItem href="/reports" icon={<BarChart />} label="Reports" active={pathname === '/reports'} />
                        <NavItem href="/settings" icon={<Settings />} label="Settings" active={pathname === '/settings'} />
                    </>
                )}
            </nav>

            {currentUser && (
                <div className="p-4 border-t border-border">
                    <button
                        onClick={() => {
                            logout();
                            window.location.href = '/login';
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 font-bold hover:shadow-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            )}
        </aside>
    );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 -translate-y-[1px]'
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:-translate-y-[1px]'
                }`}
        >
            <span className="w-5 h-5">{icon}</span>
            {label}
        </Link>
    );
}
