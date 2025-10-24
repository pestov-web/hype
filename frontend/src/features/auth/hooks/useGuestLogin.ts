import { useState, useEffect } from 'react';
import { useAuthStore } from '@shared/lib/hooks/useStores';

/**
 * Hook для управления состоянием диалога входа
 */
export const useGuestLogin = () => {
    const authStore = useAuthStore();
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        // Показать диалог, если пользователь не авторизован
        if (!authStore.isAuthenticated) {
            setShowDialog(true);
        }
    }, [authStore.isAuthenticated]);

    return {
        showDialog: showDialog && !authStore.isAuthenticated,
        setShowDialog,
    };
};
