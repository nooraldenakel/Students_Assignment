'use client';

import { useEffect } from 'react';
import { useStore } from '../lib/store';

export default function StoreProvider({ children }: { children: React.ReactNode }) {
    const initRealtime = useStore(state => state.initRealtime);

    useEffect(() => {
        initRealtime();
    }, [initRealtime]);

    return <>{children}</>;
}
