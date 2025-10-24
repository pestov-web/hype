import { makeAutoObservable, runInAction } from 'mobx';
import type { User } from '@entities/user/model/types';
import { userService } from '@shared/lib/services/userService';

export class UsersStore {
    users: User[] = [];
    isLoading = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get onlineUsers() {
        return this.users.filter((user) => user.isOnline);
    }

    get offlineUsers() {
        return this.users.filter((user) => !user.isOnline);
    }

    getUserById(id: string) {
        return this.users.find((user) => user.id === id);
    }

    async loadUsers() {
        this.isLoading = true;
        this.error = null;

        try {
            const response = await userService.getUsers();

            if (response.success && response.data) {
                runInAction(() => {
                    // Map users and compute isOnline from status
                    this.users = response.data.map((user) => ({
                        ...user,
                        isOnline: user.status.toUpperCase() === 'ONLINE',
                    }));
                    this.isLoading = false;
                    console.log('👥 Loaded users:', this.users.length, 'online:', this.onlineUsers.length);
                });
            } else {
                runInAction(() => {
                    this.error = response.error || 'Failed to load users';
                    this.isLoading = false;
                });
            }
        } catch (error) {
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Failed to load users';
                this.isLoading = false;
            });
        }
    }

    async updateUserStatus(userId: string, status: 'ONLINE' | 'IDLE' | 'DND' | 'OFFLINE') {
        try {
            const statusLower = status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline';
            const response = await userService.updateUserStatus(userId, statusLower);

            if (response.success && response.data) {
                runInAction(() => {
                    const userIndex = this.users.findIndex((u) => u.id === userId);
                    if (userIndex !== -1) {
                        this.users[userIndex] = {
                            ...response.data,
                            isOnline: response.data.status.toUpperCase() === 'ONLINE',
                        };
                    }
                });
            }
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    }

    addUser(user: User) {
        const existingIndex = this.users.findIndex((u) => u.id === user.id);
        if (existingIndex === -1) {
            this.users.push({
                ...user,
                isOnline: user.status.toUpperCase() === 'ONLINE',
            });
        }
    }

    updateUser(user: User) {
        const index = this.users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
            this.users[index] = {
                ...user,
                isOnline: user.status.toUpperCase() === 'ONLINE',
            };
        }
    }

    removeUser(userId: string) {
        this.users = this.users.filter((u) => u.id !== userId);
    }

    clearUsers() {
        this.users = [];
        this.error = null;
    }
}

export const usersStore = new UsersStore();
