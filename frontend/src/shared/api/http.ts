import { getAccessToken } from '@shared/lib/utils/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export interface ApiResponse<T = unknown> {
    data: T;
    success: boolean;
    error?: string;
}

export interface ApiConfig {
    baseUrl: string;
    timeout: number;
    getAuthToken?: () => string | null;
}

export class ApiClient {
    private config: ApiConfig;

    constructor(config: ApiConfig) {
        this.config = config;
    }

    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>('GET', endpoint);
    }

    async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('POST', endpoint, data);
    }

    async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', endpoint, data);
    }

    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', endpoint);
    }

    private async request<T>(method: string, endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
        try {
            const url = `${this.config.baseUrl}${endpoint}`;
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // Add authorization header if token provider is configured
            if (this.config.getAuthToken) {
                const token = this.config.getAuthToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const options: RequestInit = {
                method,
                headers,
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            options.signal = controller.signal;

            const response = await fetch(url, options);
            clearTimeout(timeoutId);

            if (!response.ok) {
                return {
                    data: null as T,
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                };
            }

            const responseData = await response.json();

            // Backend already returns ApiResponse format { success, data, error? }
            // So we just return it as-is instead of double-wrapping
            if (typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
                return responseData as ApiResponse<T>;
            }

            // Fallback for non-standard responses
            return {
                data: responseData,
                success: true,
            };
        } catch (error) {
            return {
                data: null as T,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

// Default API client instance
export const apiClient = new ApiClient({
    baseUrl: API_BASE_URL || 'http://localhost:3001/api',
    timeout: 10000,
    getAuthToken: getAccessToken,
});
