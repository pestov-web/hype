import type { ReactNode } from 'react';
import { StoreProvider } from './StoreProvider';

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    // Global providers:
    // - MobX Store Provider
    // - WebSocket connection
    // - WebRTC context

    return <StoreProvider>{children}</StoreProvider>;
}
