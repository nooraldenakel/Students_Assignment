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
            <div className="p-6 border-b border-border">
                <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    <span className="truncate">Student Manager</span>
                </h1>
                {currentUser && (
                    <div className="mt-4 p-3 bg-muted rounded-lg border border-border">
                        <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{currentUser.role}</p>
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
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
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
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-muted hover:text-primary'
                }`}
        >
            <span className="w-5 h-5">{icon}</span>
            {label}
        </Link>
    );
}
