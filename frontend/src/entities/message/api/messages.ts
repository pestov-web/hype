import { apiClient, type ApiResponse } from '@shared/api';
import { wsClient } from '@shared/api/websocket';
import type { ApiMessage, CreateMessagePayload, UpdateMessagePayload } from '../model/types';

/**
 * Клиент API для сообщений
 * Комбинирует REST API для операций CRUD и WebSocket для обновлений в реальном времени
 */
class MessageApi {
    /**
     * Получить сообщения канала (с пагинацией)
     * GET /api/messages?channelId=:id
     */
    async getMessages(channelId: string, limit = 50, offset = 0): Promise<ApiResponse<ApiMessage[]>> {
        console.log('[MessageApi] Fetching messages:', { channelId, limit, offset });
        const response = await apiClient.get<ApiMessage[]>(
            `/messages?channelId=${channelId}&limit=${limit}&offset=${offset}`
        );
        console.log('[MessageApi] Received response:', response);
        return response;
    }

    /**
     * Получить конкретное сообщение по ID
     * GET /api/messages/:id
     */
    async getMessageById(id: string): Promise<ApiResponse<ApiMessage>> {
        return apiClient.get<ApiMessage>(`/messages/${id}`);
    }

    /**
     * Отправить новое сообщение (требуется JWT аутентификация)
     * POST /api/messages
     *
     * Примечание: После успешного создания сообщение будет разослано всем
     * участникам канала через WebSocket, поэтому не нужно вручную добавлять его в UI
     */
    async sendMessage(payload: CreateMessagePayload): Promise<ApiResponse<ApiMessage>> {
        return apiClient.post<ApiMessage>('/messages', payload);
    }

    /**
     * Редактировать сообщение (требуется JWT аутентификация, только автор)
     * PUT /api/messages/:id
     */
    async editMessage(id: string, payload: UpdateMessagePayload): Promise<ApiResponse<ApiMessage>> {
        return apiClient.put<ApiMessage>(`/messages/${id}`, payload);
    }

    /**
     * Удалить сообщение (требуется JWT аутентификация, только автор)
     * DELETE /api/messages/:id
     */
    async deleteMessage(id: string): Promise<ApiResponse<{ id: string }>> {
        return apiClient.delete<{ id: string }>(`/messages/${id}`);
    }

    // ==========================================
    // Методы WebSocket для работы в реальном времени
    // ==========================================

    /**
     * Подписаться на новые сообщения
     * Слушает события WebSocket 'new_message'
     *
     * @param callback Функция, которая будет вызвана при получении нового сообщения
     * @returns Функция для отписки от события
     */
    onNewMessage(callback: (message: ApiMessage) => void): () => void {
        console.log('[MessageApi] Subscribing to new_message events');
        const handler = (data: unknown) => {
            console.log('[MessageApi] Received new_message event:', data);
            const message = data as ApiMessage;
            callback(message);
        };

        wsClient.on('new_message', handler);

        // Return unsubscribe function
        return () => {
            console.log('[MessageApi] Unsubscribing from new_message events');
            wsClient.off('new_message', handler);
        };
    }

    /**
     * Подписаться на редактирование сообщений
     * Слушает события WebSocket 'message_edited'
     *
     * @param callback Функция, которая будет вызвана при редактировании сообщения
     * @returns Функция для отписки
     */
    onMessageEdited(callback: (message: ApiMessage) => void): () => void {
        const handler = (data: unknown) => {
            const message = data as ApiMessage;
            callback(message);
        };

        wsClient.on('message_edited', handler);

        return () => {
            wsClient.off('message_edited', handler);
        };
    }

    /**
     * Подписаться на удаление сообщений
     * Слушает события WebSocket 'message_deleted'
     *
     * @param callback Функция, которая будет вызвана при удалении сообщения
     * @returns Функция для отписки
     */
    onMessageDeleted(callback: (data: { messageId: string; channelId: string }) => void): () => void {
        const handler = (data: unknown) => {
            const deletedData = data as { messageId: string; channelId: string };
            callback(deletedData);
        };

        wsClient.on('message_deleted', handler);

        return () => {
            wsClient.off('message_deleted', handler);
        };
    }

    /**
     * Отправить индикатор печати
     * Уведомляет других пользователей, что текущий пользователь печатает в канале
     *
     * @param channelId ID канала, где пользователь печатает
     * @param userId ID текущего пользователя
     */
    sendTypingIndicator(channelId: string, userId: string): void {
        wsClient.sendTyping(channelId, userId);
    }

    /**
     * Подписаться на индикаторы печати
     *
     * @param callback Функция, которая будет вызвана при начале печати пользователем
     * @returns Функция для отписки
     */
    onTyping(callback: (data: { channelId: string; userId: string }) => void): () => void {
        const handler = (data: unknown) => {
            const typingData = data as { channelId: string; userId: string };
            callback(typingData);
        };

        wsClient.on('typing', handler);

        return () => {
            wsClient.off('typing', handler);
        };
    }

    /**
     * Проверить, подключен ли WebSocket
     */
    get isConnected(): boolean {
        return wsClient.isConnected;
    }
}

export const messageApi = new MessageApi();
