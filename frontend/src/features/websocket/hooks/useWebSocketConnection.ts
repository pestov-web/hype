import { useEffect } from 'react';
import { wsClient } from '@shared/api';
import { useAuthStore } from '@shared/lib/hooks/useStores';

/**
 * Hook для подключения к WebSocket после авторизации
 */
export const useWebSocketConnection = () => {
    const authStore = useAuthStore();

    useEffect(() => {
        if (authStore.isAuthenticated && authStore.currentUser) {
            const connectWebSocket = async () => {
                try {
                    await wsClient.connect();
                    console.log('✅ Connected to WebSocket');

                    // Send user joined event
                    wsClient.send('user_joined', { user: authStore.currentUser });

                    // Listen for real-time updates
                    // wsClient.on('message', (data) => {
                    //     console.log('📨 New message:', data);
                    // });

                    wsClient.on('voice_state', (data) => {
                        console.log('🎤 Voice state update (useWebSocketConnection):', data);
                    });
                } catch (wsError) {
                    console.warn('WebSocket connection failed:', wsError);
                }
            };

            connectWebSocket();

            return () => {
                wsClient.disconnect();
            };
        }
    }, [authStore.isAuthenticated, authStore.currentUser]);
};
