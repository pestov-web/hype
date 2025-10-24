import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { MainLayout } from '../layouts/MainLayout.tsx';
import { HomePage } from '../../pages/home/HomePage.tsx';
import { LoginPage } from '../../pages/login/LoginPage.tsx';
import { rootStore } from '@app/stores';

// Protected route wrapper
const ProtectedRoute = observer(({ children }: { children: React.ReactNode }) => {
    const { auth } = rootStore;

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (!auth.isAuthenticated) {
        return <Navigate to='/login' replace />;
    }

    return <>{children}</>;
});

// Router configuration (using HashRouter for Electron compatibility)
const router = createHashRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: 'channels/:channelId',
                lazy: async () => {
                    const { ChannelPage } = await import('../../pages/channel/ChannelPage.tsx');
                    return { Component: ChannelPage };
                },
            },
            {
                path: 'settings',
                lazy: async () => {
                    const { SettingsPage } = await import('../../pages/settings/SettingsPage.tsx');
                    return { Component: SettingsPage };
                },
            },
        ],
    },
]);

// Router component
export function AppRouter() {
    return <RouterProvider router={router} />;
}
