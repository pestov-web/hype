import { makeAutoObservable } from 'mobx';
import type { User } from '@entities/user/model/types';
import { authService, type LoginData, type RegisterData, type GuestLoginData } from '@shared/lib/services/authService';
import { setTokens, clearTokens, getAccessToken } from '@shared/lib/utils/tokenStorage';

type UserStatus = User['status'];

export class AuthStore {
    currentUser: User | null = null;
    isAuthenticated = false;
    isLoading = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
        // Try to restore session on init
        this.restoreSession();
    }

    setCurrentUser(user: User | null) {
        this.currentUser = user;
        this.isAuthenticated = !!user;
    }

    setLoading(loading: boolean) {
        this.isLoading = loading;
    }

    setError(error: string | null) {
        this.error = error;
    }

    updateUserStatus(status: UserStatus) {
        if (this.currentUser) {
            this.currentUser.status = status;
        }
    }

    /**
     * Регистрация нового пользователя
     */
    async register(data: RegisterData) {
        this.setLoading(true);
        this.setError(null);

        try {
            const response = await authService.register(data);

            if (response.success && response.data) {
                const { user, accessToken, refreshToken } = response.data;

                // Save tokens
                setTokens(accessToken, refreshToken);

                // Convert backend user to frontend User type
                this.setCurrentUser({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isGuest: false,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    bio: null,
                    customStatus: null,
                    status: user.status,
                    isOnline: true,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(),
                });

                return { success: true };
            } else {
                this.setError(response.error || 'Registration failed');
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            this.setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Вход по email и паролю
     */
    async login(data: LoginData) {
        this.setLoading(true);
        this.setError(null);

        try {
            const response = await authService.login(data);

            if (response.success && response.data) {
                const { user, accessToken, refreshToken } = response.data;

                // Save tokens
                setTokens(accessToken, refreshToken);

                // Convert backend user to frontend User type
                this.setCurrentUser({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isGuest: false,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    bio: null,
                    customStatus: null,
                    status: user.status,
                    isOnline: true,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(),
                });

                return { success: true };
            } else {
                this.setError(response.error || 'Login failed');
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            this.setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Вход как гость
     */
    async loginAsGuest(data: GuestLoginData) {
        this.setLoading(true);
        this.setError(null);

        try {
            const response = await authService.loginAsGuest(data);

            if (response.success && response.data) {
                const { user, accessToken, refreshToken } = response.data;

                // Save tokens
                setTokens(accessToken, refreshToken);

                // Convert backend user to frontend User type
                this.setCurrentUser({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isGuest: true,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    bio: null,
                    customStatus: null,
                    status: user.status,
                    isOnline: true,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(),
                });

                return { success: true };
            } else {
                this.setError(response.error || 'Guest login failed');
                return { success: false, error: response.error };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Guest login failed';
            this.setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Восстановление сессии из сохраненного токена
     */
    async restoreSession() {
        const token = getAccessToken();
        if (!token) {
            console.log('🔐 No access token found, skipping session restore');
            return;
        }

        this.setLoading(true);

        try {
            console.log('🔐 Attempting to restore session with token...');
            const response = await authService.getCurrentUser();

            console.log('🔐 getCurrentUser response:', response);

            if (response.success && response.data && response.data.user) {
                const { user } = response.data;

                console.log('✅ Session restored for user:', user.username);

                this.setCurrentUser({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isGuest: false,
                    displayName: user.displayName,
                    avatarUrl: user.avatarUrl,
                    bio: null,
                    customStatus: null,
                    status: user.status,
                    isOnline: true,
                    createdAt: new Date(user.createdAt),
                    updatedAt: new Date(),
                });
            } else {
                // Token is invalid or response is malformed, clear it
                console.warn('⚠️ Invalid token or response, clearing tokens');
                clearTokens();
            }
        } catch (error) {
            // Token is invalid or expired, clear it
            console.error('❌ Failed to restore session:', error);
            clearTokens();
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Выход из системы
     */
    async logout() {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearTokens();
            this.currentUser = null;
            this.isAuthenticated = false;
            this.error = null;
        }
    }

    // DEPRECATED: Mock login for development - use real login instead
    mockLogin() {
        console.warn('mockLogin is deprecated, use login() instead');
        this.loginAsGuest({ username: 'TestUser' });
    }
}

export const authStore = new AuthStore();
