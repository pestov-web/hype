import { apiClient, type ApiResponse } from '@shared/api';
import type { UpdateUserProfilePayload, UpdateUserStatusPayload, User } from '../model/types';

/**
 * User API client
 */
class UserApi {
    /**
     * Get all users
     * GET /api/users
     */
    async getUsers(): Promise<ApiResponse<User[]>> {
        return apiClient.get<User[]>('/users');
    }

    /**
     * Get user by ID
     * GET /api/users/:id
     */
    async getUserById(id: string): Promise<ApiResponse<User>> {
        return apiClient.get<User>(`/users/${id}`);
    }

    /**
     * Update user status
     * PUT /api/users/:id/status
     */
    async updateUserStatus(id: string, payload: UpdateUserStatusPayload): Promise<ApiResponse<User>> {
        return apiClient.put<User>(`/users/${id}/status`, payload);
    }

    /**
     * Update user profile (requires JWT auth)
     * PUT /api/users/:id
     *
     * Note: User can only update their own profile
     */
    async updateUserProfile(id: string, payload: UpdateUserProfilePayload): Promise<ApiResponse<User>> {
        return apiClient.put<User>(`/users/${id}`, payload);
    }
}

export const userApi = new UserApi();
