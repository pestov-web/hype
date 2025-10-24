import { makeAutoObservable, runInAction } from 'mobx';
import { messageApi } from '../api';
import { wsClient } from '@shared/api/websocket';
import type { ApiMessage } from './types';

/**
 * MobX стор для управления сообщениями
 *
 * Отвечает за:
 * - Кэширование сообщений по каналам
 * - Реактивное состояние загрузки и ошибок
 * - Подписку на WebSocket события для обновлений в реальном времени
 * - Автоматическое обновление UI через MobX observers
 */
export class MessagesStore {
    /** Кэш сообщений по ID канала */
    messagesByChannel: Map<string, ApiMessage[]> = new Map();

    /** ID активного канала */
    activeChannelId: string | null = null;

    /** Флаг загрузки */
    isLoading = false;

    /** Сообщение об ошибке */
    error: string | null = null;

    /** Функции отписки от WebSocket событий */
    private unsubscribers: Array<() => void> = [];

    constructor() {
        makeAutoObservable(this);
        this.setupWebSocketListeners();
    }

    /**
     * Настройка WebSocket подписок для получения обновлений в реальном времени
     *
     * Подписывается на события:
     * - Новые сообщения
     * - Редактирование сообщений
     * - Удаление сообщений
     */
    private setupWebSocketListeners() {
        console.log('[MessagesStore] Setting up WebSocket listeners');

        // Подписка на новые сообщения
        const unsubNew = messageApi.onNewMessage((message) => {
            console.log('[MessagesStore] Received new message via WebSocket:', message);
            runInAction(() => {
                this.addMessage(message.channelId, message);
            });
        });

        // Подписка на редактирование сообщений
        const unsubEdit = messageApi.onMessageEdited((message) => {
            console.log('[MessagesStore] Received message edit via WebSocket:', message);
            runInAction(() => {
                this.updateMessage(message.channelId, message);
            });
        });

        // Подписка на удаление сообщений
        const unsubDelete = messageApi.onMessageDeleted(({ messageId, channelId }) => {
            console.log('[MessagesStore] Received message delete via WebSocket:', { messageId, channelId });
            runInAction(() => {
                this.removeMessage(channelId, messageId);
            });
        });

        this.unsubscribers = [unsubNew, unsubEdit, unsubDelete];
    }

    /**
     * Получить сообщения для конкретного канала из кэша
     *
     * @param channelId - ID канала
     * @returns Массив сообщений или пустой массив
     */
    getMessages(channelId: string): ApiMessage[] {
        return this.messagesByChannel.get(channelId) || [];
    }

    /**
     * Загрузить сообщения канала с сервера
     *
     * @param channelId - ID канала
     * @param limit - Максимальное количество сообщений (по умолчанию 50)
     * @param offset - Смещение для пагинации (по умолчанию 0)
     */
    async loadMessages(channelId: string, limit = 50, offset = 0) {
        console.log('[MessagesStore] Loading messages for channel:', channelId);
        this.isLoading = true;
        this.error = null;

        try {
            const response = await messageApi.getMessages(channelId, limit, offset);
            console.log('[MessagesStore] API response:', response);

            runInAction(() => {
                if (response.success && response.data) {
                    console.log('[MessagesStore] Setting messages:', response.data);
                    console.log('[MessagesStore] Messages is array:', Array.isArray(response.data));
                    this.messagesByChannel.set(channelId, response.data);
                } else {
                    console.error('[MessagesStore] Failed to load messages:', response.error);
                }
                this.isLoading = false;
            });
        } catch (error) {
            console.error('[MessagesStore] Error loading messages:', error);
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Не удалось загрузить сообщения';
                this.isLoading = false;
            });
        }
    }

    /**
     * Отправить новое сообщение в канал
     *
     * Примечание: После успешной отправки сервер отправит сообщение через WebSocket,
     * и оно автоматически добавится в кэш через onNewMessage подписку.
     * authorId берется автоматически из JWT токена на бэкенде.
     *
     * @param channelId - ID канала
     * @param content - Текст сообщения
     */
    async sendMessage(channelId: string, content: string) {
        try {
            const response = await messageApi.sendMessage({
                channelId,
                content,
            });

            if (!response.success) {
                runInAction(() => {
                    this.error = response.error || 'Не удалось отправить сообщение';
                });
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Не удалось отправить сообщение';
            });
        }
    }

    /**
     * Редактировать существующее сообщение
     *
     * @param messageId - ID сообщения
     * @param content - Новый текст сообщения
     */
    async editMessage(messageId: string, content: string) {
        try {
            const response = await messageApi.editMessage(messageId, { content });

            if (!response.success) {
                runInAction(() => {
                    this.error = response.error || 'Не удалось отредактировать сообщение';
                });
            }
        } catch (error) {
            console.error('Failed to edit message:', error);
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Не удалось отредактировать сообщение';
            });
        }
    }

    /**
     * Удалить сообщение
     *
     * @param messageId - ID сообщения
     */
    async deleteMessage(messageId: string) {
        try {
            const response = await messageApi.deleteMessage(messageId);

            if (!response.success) {
                runInAction(() => {
                    this.error = response.error || 'Не удалось удалить сообщение';
                });
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Не удалось удалить сообщение';
            });
        }
    }

    /**
     * Добавить сообщение в кэш канала
     *
     * Вызывается автоматически при получении WebSocket события о новом сообщении
     *
     * @param channelId - ID канала
     * @param message - Объект сообщения
     */
    private addMessage(channelId: string, message: ApiMessage) {
        const messages = this.messagesByChannel.get(channelId) || [];

        // Проверка на дубликаты
        const exists = messages.some((m) => m.id === message.id);
        if (!exists) {
            this.messagesByChannel.set(channelId, [...messages, message]);
        }
    }

    /**
     * Обновить сообщение в кэше
     *
     * Вызывается автоматически при получении WebSocket события о редактировании
     *
     * @param channelId - ID канала
     * @param updatedMessage - Обновленный объект сообщения
     */
    private updateMessage(channelId: string, updatedMessage: ApiMessage) {
        const messages = this.messagesByChannel.get(channelId);
        if (!messages) return;

        const updatedMessages = messages.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg));

        this.messagesByChannel.set(channelId, updatedMessages);
    }

    /**
     * Удалить сообщение из кэша
     *
     * Вызывается автоматически при получении WebSocket события об удалении
     *
     * @param channelId - ID канала
     * @param messageId - ID удаленного сообщения
     */
    private removeMessage(channelId: string, messageId: string) {
        const messages = this.messagesByChannel.get(channelId);
        if (!messages) return;

        const filteredMessages = messages.filter((msg) => msg.id !== messageId);
        this.messagesByChannel.set(channelId, filteredMessages);
    }

    /**
     * Установить активный канал
     *
     * Автоматически загружает сообщения, если они еще не загружены
     *
     * @param channelId - ID канала или null для сброса
     */
    setActiveChannel(channelId: string | null) {
        console.log('[MessagesStore] Setting active channel:', channelId);
        console.log('[MessagesStore] Current messagesByChannel Map:', this.messagesByChannel);
        console.log('[MessagesStore] Map size:', this.messagesByChannel.size);
        console.log('[MessagesStore] Map keys:', Array.from(this.messagesByChannel.keys()));

        // Leave previous channel
        if (this.activeChannelId && this.activeChannelId !== channelId) {
            console.log('[MessagesStore] Leaving previous channel:', this.activeChannelId);
            wsClient.leaveChannel(this.activeChannelId);
        }

        if (channelId) {
            const hasMessages = this.messagesByChannel.has(channelId);
            const messages = this.messagesByChannel.get(channelId);
            console.log('[MessagesStore] Has cached messages:', hasMessages);
            console.log('[MessagesStore] Cached messages value:', messages);
            console.log('[MessagesStore] Cached messages length:', messages?.length);

            // Join new channel
            console.log('[MessagesStore] Joining new channel:', channelId);
            wsClient.joinChannel(channelId);
        }

        this.activeChannelId = channelId;

        // Загрузить сообщения, если канал еще не загружен
        if (channelId && !this.messagesByChannel.has(channelId)) {
            console.log('[MessagesStore] Channel not cached, loading messages...');
            this.loadMessages(channelId);
        } else if (channelId) {
            console.log('[MessagesStore] Using cached messages');
        }
    }

    /**
     * Получить сообщения активного канала (computed property)
     *
     * Автоматически обновляется при изменении activeChannelId или сообщений
     */
    get activeMessages(): ApiMessage[] {
        console.log('[MessagesStore] activeMessages getter called');
        console.log('[MessagesStore] activeChannelId:', this.activeChannelId);

        if (!this.activeChannelId) {
            console.log('[MessagesStore] No active channel, returning empty array');
            return [];
        }

        const messages = this.messagesByChannel.get(this.activeChannelId) || [];
        console.log('[MessagesStore] Returning messages:', messages.length, 'messages');
        return messages;
    }

    /**
     * Очистить кэш сообщений для канала
     *
     * @param channelId - ID канала
     */
    clearMessages(channelId: string) {
        this.messagesByChannel.delete(channelId);
    }

    /**
     * Отправить индикатор печати
     *
     * @param channelId - ID канала
     * @param userId - ID пользователя
     */
    sendTypingIndicator(channelId: string, userId: string) {
        messageApi.sendTypingIndicator(channelId, userId);
    }

    /**
     * Очистить все подписки при уничтожении стора
     */
    dispose() {
        this.unsubscribers.forEach((unsub) => unsub());
        this.unsubscribers = [];
    }
}

export const messagesStore = new MessagesStore();
