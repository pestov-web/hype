import { useContext } from 'react';
import { StoreContext } from '@app/providers/StoreProvider';

export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useStore must be used within StoreProvider');
    }
    return context;
};

// Individual store hooks for convenience
export const useAuthStore = () => useStore().auth;
export const useChannelsStore = () => useStore().channels;
export const useMessagesStore = () => useStore().messages;
export const useVoiceStore = () => useStore().voice;
