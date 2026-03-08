'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../lib/store';
import { Users, List, BarChart, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Sidebar() {
    const pathname = usePathname();
    const { currentUser, logout } = useStore();
    const [mounted, setMounted] = useState(false);

    // Auto-collapse based on window size initially, or persist in localStorage if desired.
    // For now, default to expanded on load, or we can just use simple state.
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Optional: read from localStorage here to persist state
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState) setIsCollapsed(JSON.parse(savedState));
    }, []);

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        setIsHovered(false); // Reset hover state to avoid confusion when clicking
        localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
    };

    if (!mounted) return null; // Hydration fix

    // Don't show sidebar on login page
    if (pathname === '/login') return null;

    const expanded = !isCollapsed || isHovered;

    return (
        <>
            {/* Placeholder to keep layout consistent and prevent shift on hover-expand */}
            <div className={`transition-all duration-300 ease-in-out flex-shrink-0 hidden md:block ${isCollapsed ? 'w-20' : 'w-64'}`} />

            <aside
                className={`fixed left-0 top-0 bottom-0 bg-white border-r border-border flex flex-col transition-all duration-300 ease-in-out z-50 ${expanded ? 'w-64 shadow-xl' : 'w-20'}`}
                onMouseEnter={() => {
                    if (isCollapsed) setIsHovered(true);
                }}
                onMouseLeave={() => {
                    if (isHovered) setIsHovered(false);
                }}
            >
                {/* Collapse Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-8 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-full p-1 shadow-md z-50 transition-colors"
                    title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {isCollapsed && !isHovered ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                <div className={`p-6 border-b border-slate-200 flex flex-col transition-all duration-300 ${expanded ? 'items-start' : 'items-center px-4'}`}>
                    <h1 className={`text-xl font-bold flex items-center w-full ${expanded ? 'justify-start gap-3' : 'justify-center'}`}>
                        <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
                            <Users className="w-5 h-5" />
                        </div>
                        {expanded && (
                            <span className="truncate bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 whitespace-nowrap opacity-100 transition-opacity duration-300 animate-in fade-in">
                                EduManager
                            </span>
                        )}
                    </h1>

                    <div className={`transition-all duration-300 w-full flex justify-center ${expanded ? 'mt-6' : 'mt-6'}`}>
                        {currentUser && expanded && (
                            <div className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 transition-all hover:shadow-md hover:border-indigo-100 animate-in fade-in duration-300 overflow-hidden">
                                <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                                <p className="text-xs font-semibold text-indigo-600/80 capitalize mt-0.5">{currentUser.role}</p>
                            </div>
                        )}
                        {currentUser && !expanded && (
                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-indigo-700 font-bold text-lg" title={`${currentUser.name} (${currentUser.role})`}>
                                {currentUser.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
                    {currentUser?.role !== 'Viewer' && (
                        <NavItem href="/" icon={<Users />} label="Main List" active={pathname === '/'} expanded={expanded} />
                    )}
                    <NavItem href="/list/l1" icon={<List />} label="List 1" active={pathname === '/list/l1'} expanded={expanded} />
                    <NavItem href="/list/l2" icon={<List />} label="List 2" active={pathname === '/list/l2'} expanded={expanded} />
                    <NavItem href="/list/l3" icon={<List />} label="List 3" active={pathname === '/list/l3'} expanded={expanded} />
                    <NavItem href="/list/l4" icon={<List />} label="List 4" active={pathname === '/list/l4'} expanded={expanded} />

                    {currentUser?.role === 'Admin' && (
                        <>
                            <div className="my-4 border-t border-border w-full transition-all" />
                            <NavItem href="/reports" icon={<BarChart />} label="Reports" active={pathname === '/reports'} expanded={expanded} />
                            <NavItem href="/settings" icon={<Settings />} label="Settings" active={pathname === '/settings'} expanded={expanded} />
                        </>
                    )}
                </nav>

                {currentUser && (
                    <div className="p-4 border-t border-border mt-auto">
                        <button
                            onClick={() => {
                                logout();
                                window.location.href = '/login';
                            }}
                            title={!expanded ? 'Sign Out' : undefined}
                            className={`flex items-center gap-3 w-full py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200 font-bold hover:shadow-sm overflow-hidden ${expanded ? 'px-4 justify-start' : 'px-0 justify-center'}`}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            {expanded && <span className="whitespace-nowrap animate-in fade-in duration-300">Sign Out</span>}
                        </button>
                    </div>
                )}
            </aside>
        </>
    );
}

function NavItem({ href, icon, label, active, expanded }: { href: string; icon: React.ReactNode; label: string; active: boolean; expanded: boolean }) {
    return (
        <Link
            href={href}
            title={!expanded ? label : undefined}
            className={`flex items-center gap-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 overflow-hidden ${active
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
                } ${expanded ? 'px-4 justify-start hover:-translate-y-[1px]' : 'px-0 justify-center'}`}
        >
            <span className="w-5 h-5 flex-shrink-0">{icon}</span>
            {expanded && <span className="truncate whitespace-nowrap animate-in fade-in duration-300">{label}</span>}
        </Link>
    );
}
