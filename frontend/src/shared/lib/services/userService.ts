import { apiClient } from '../../api';
import type { User } from '../../../entities/user';

export const userService = {
    async getUsers() {
        return apiClient.get<User[]>('/users');
    },

    async getUser(id: string) {
        return apiClient.get<User>(`/users/${id}`);
    },

    async createUser(data: { username: string; email: string }) {
        return apiClient.post<User>('/users', data);
    },

    async updateUserStatus(id: string, status: 'online' | 'idle' | 'dnd' | 'offline') {
        return apiClient.put<User>(`/users/${id}/status`, { status });
    },
};
