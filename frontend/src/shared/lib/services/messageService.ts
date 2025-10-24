import { apiClient } from '../../api';
import type { Message } from '../../../entities/message';

export const messageService = {
    async getMessages(channelId: string, limit = 50, offset = 0) {
        return apiClient.get<Message[]>(`/messages?channelId=${channelId}&limit=${limit}&offset=${offset}`);
    },

    async getMessage(id: string) {
        return apiClient.get<Message>(`/messages/${id}`);
    },

    async createMessage(data: { content: string; authorId: string; channelId: string }) {
        return apiClient.post<Message>('/messages', data);
    },

    async updateMessage(id: string, content: string) {
        return apiClient.put<Message>(`/messages/${id}`, { content });
    },

    async deleteMessage(id: string) {
        return apiClient.delete<Message>(`/messages/${id}`);
    },
};
