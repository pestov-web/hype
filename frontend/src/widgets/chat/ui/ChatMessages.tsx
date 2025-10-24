import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ApiMessage } from '@entities/message';
import styles from './ChatMessages.module.scss';

interface ChatMessagesProps {
    messages: ApiMessage[];
    isLoading?: boolean;
}

export const ChatMessages = observer(({ messages, isLoading }: ChatMessagesProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (isLoading) {
        return (
            <div className={styles.messagesContainer}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading messages...</p>
                </div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className={styles.messagesContainer}>
                <div className={styles.empty}>
                    <svg
                        className={styles.emptyIcon}
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                    >
                        <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
                    </svg>
                    <p>No messages yet</p>
                    <span>Be the first to say hello!</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.messagesContainer}>
            <div className={styles.messagesList}>
                {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
});
