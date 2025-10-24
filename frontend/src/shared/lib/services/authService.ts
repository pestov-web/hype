import { ApiClient } from '@shared/api/http';
import { getAccessToken } from '@shared/lib/utils/tokenStorage';

const API_AUTH_URL = import.meta.env.VITE_AUTH_URL;

const authClient = new ApiClient({
    baseUrl: API_AUTH_URL || 'http://localhost:3001',
    timeout: 10000,
    getAuthToken: () => getAccessToken(),
});

// Response types matching backend
export interface AuthResponse {
    user: {
        id: string;
        username: string;
        displayName: string | null;
        email: string | null;
        avatarUrl: string | null;
        status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE';
        createdAt: string;
    };
    accessToken: string;
    refreshToken: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface GuestLoginData {
    username: string;
}

class AuthService {
    /**
     * Регистрация нового пользователя
     */
    async register(data: RegisterData) {
        return authClient.post<AuthResponse>('/auth/register', data);
    }

    /**
     * Вход по email и паролю
     */
    async login(data: LoginData) {
        return authClient.post<AuthResponse>('/auth/login', data);
    }

    /**
     * Вход как гость (без регистрации)
     */
    async loginAsGuest(data: GuestLoginData) {
        return authClient.post<AuthResponse>('/auth/guest', data);
    }

    /**
     * Обновление токенов
     */
    async refreshTokens(refreshToken: string) {
        return authClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    }

    /**
     * Получение текущего пользователя (требует токен в localStorage)
     */
    async getCurrentUser() {
        return authClient.get<{ user: AuthResponse['user'] }>('/auth/me');
    }

    /**
     * Выход из системы
     */
    async logout() {
        return authClient.post('/auth/logout');
    }
}

export const authService = new AuthService();
