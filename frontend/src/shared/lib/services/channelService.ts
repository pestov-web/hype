import { apiClient } from '../../api';
import type { Channel } from '../../../entities/channel';

export const channelService = {
    async getChannels() {
        return apiClient.get<Channel[]>('/channels');
    },

    async getChannel(id: string) {
        return apiClient.get<Channel>(`/channels/${id}`);
    },

    async createChannel(data: {
        name: string;
        type: 'text' | 'voice';
        topic?: string;
        userLimit?: number;
        bitrate?: number;
    }) {
        return apiClient.post<Channel>('/channels', data);
    },

    async updateChannel(id: string, data: Partial<Channel>) {
        return apiClient.put<Channel>(`/channels/${id}`, data);
    },

    async deleteChannel(id: string) {
        return apiClient.delete<Channel>(`/channels/${id}`);
    },
};
