import { useEffect } from 'react';
import { useChannelsStore } from '@shared/lib/hooks/useStores';

/**
 * Hook для загрузки начальных данных приложения
 */
export const useAppInitialization = () => {
    const channelsStore = useChannelsStore();

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                await channelsStore.loadDefaultServer();
            } catch (err) {
                console.error('Failed to load initial data:', err);
            }
        };

        loadInitialData();
    }, [channelsStore]);

    return {
        isLoading: channelsStore.isLoading,
        error: channelsStore.error,
    };
};
