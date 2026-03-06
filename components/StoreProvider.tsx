'use client';

import { useEffect } from 'react';
import { useStore } from '../lib/store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const initRealtime = useStore(state => state.initRealtime);
    const currentUser = useStore(state => state.currentUser);
    const isHydrated = useStore(state => state.isHydrated);

    useEffect(() => {
        if (isHydrated && currentUser) {
            initRealtime();
        }
    }, [initRealtime, currentUser, isHydrated]);

    return <>{children}</>;
}
