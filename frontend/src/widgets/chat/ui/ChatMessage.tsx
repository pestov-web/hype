import { observer } from 'mobx-react-lite';
import { Avatar } from '@shared/ui/Avatar';
import type { ApiMessage } from '@entities/message';
import styles from './ChatMessage.module.scss';

interface ChatMessageProps {
    message: ApiMessage;
}

export const ChatMessage = observer(({ message }: ChatMessageProps) => {
    const formatTime = (date: Date | string) => {
        // Ensure date is a Date object
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        // Check if date is valid
        if (isNaN(dateObj.getTime())) {
            return 'Invalid date';
        }

        return new Intl.DateTimeFormat('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(dateObj);
    };

    return (
        <div className={styles.message}>
            <Avatar
                src={message.author.avatarUrl ?? undefined}
                alt={message.author.username}
                size='md'
                status={message.author.status.toLowerCase() as 'online' | 'offline' | 'idle' | 'dnd'}
            />
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={styles.username}>{message.author.displayName || message.author.username}</span>
                    <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
                </div>
                <div className={styles.text}>{message.content}</div>
            </div>
        </div>
    );
});
