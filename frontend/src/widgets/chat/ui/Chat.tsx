import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { useMessagesStore, useAuthStore } from '@shared/lib/hooks/useStores';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import styles from './Chat.module.scss';

interface ChatProps {
    channelId: string;
    channelName: string;
}

export const Chat = observer(({ channelId, channelName }: ChatProps) => {
    const messagesStore = useMessagesStore();
    const authStore = useAuthStore();

    useEffect(() => {
        // Set active channel and load messages
        messagesStore.setActiveChannel(channelId);

        return () => {
            // Cleanup when unmounting
            messagesStore.setActiveChannel(null);
        };
    }, [channelId, messagesStore]);

    const handleSendMessage = (content: string) => {
        if (!authStore.currentUser) {
            console.error('No user logged in');
            return;
        }

        messagesStore.sendMessage(channelId, content);
    };

    return (
        <div className={styles.chat}>
            <div className={styles.header}>
                <div className={styles.channelInfo}>
                    <svg
                        className={styles.channelIcon}
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                    >
                        <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
                        <polyline points='22,6 12,13 2,6' />
                    </svg>
                    <h2 className={styles.channelName}>{channelName}</h2>
                </div>
            </div>

            <ChatMessages messages={messagesStore.activeMessages} isLoading={messagesStore.isLoading} />

            <ChatInput
                onSend={handleSendMessage}
                placeholder={`Message #${channelName}`}
                disabled={!authStore.isAuthenticated}
            />
        </div>
    );
});
