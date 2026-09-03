'use client';

import { useEffect } from 'react';
import { useStore } from '../lib/store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const initRealtime = useStore(state => state.initRealtime);
    const currentUser = useStore(state => state.currentUser);
    const sessionExpiresAt = useStore(state => state.sessionExpiresAt);
    const isHydrated = useStore(state => state.isHydrated);
    const logout = useStore(state => state.logout);

    // Active session watcher: automatically signs out users at 12:00 AM Baghdad Time (GMT+3)
    useEffect(() => {
        if (!isHydrated || !currentUser) return;

        const checkExpiry = async () => {
            if (!sessionExpiresAt || Date.now() >= sessionExpiresAt) {
                await logout();
                if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        };

        // 1. Check immediately
        checkExpiry();

        // 2. Schedule exact timeout for 12:00 AM Baghdad time
        let timer: NodeJS.Timeout | null = null;
        if (sessionExpiresAt) {
            const msUntilExpiry = sessionExpiresAt - Date.now();
            if (msUntilExpiry > 0) {
                timer = setTimeout(() => {
                    checkExpiry();
                }, msUntilExpiry);
            }
        }

        // 3. Fallback check every 15 seconds (catches system wake/sleep & background throttling)
        const interval = setInterval(checkExpiry, 15000);

        // 4. Check whenever tab becomes active or window gains focus
        const handleVisibilityOrFocus = () => {
            if (document.visibilityState === 'visible') {
                checkExpiry();
            }
        };
        window.addEventListener('focus', handleVisibilityOrFocus);
        document.addEventListener('visibilitychange', handleVisibilityOrFocus);

        // 5. Cross-tab synchronization: if another tab logs out, log out here as well
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'student-list-auth-v2' && !e.newValue) {
                checkExpiry();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            if (timer) clearTimeout(timer);
            clearInterval(interval);
            window.removeEventListener('focus', handleVisibilityOrFocus);
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('storage', handleStorage);
        };
    }, [isHydrated, currentUser, sessionExpiresAt, logout]);

    // Data initialization: only initialize if session is still valid
    useEffect(() => {
        if (isHydrated && currentUser) {
            if (sessionExpiresAt && Date.now() < sessionExpiresAt) {
                initRealtime();
            }
        }
    }, [initRealtime, currentUser, isHydrated, sessionExpiresAt]);

    return <>{children}</>;
}
