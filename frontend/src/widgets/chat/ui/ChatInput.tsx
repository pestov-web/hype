import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './ChatInput.module.scss';

interface ChatInputProps {
    onSend: (content: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const ChatInput = observer(({ onSend, placeholder = 'Type a message...', disabled }: ChatInputProps) => {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        const trimmedMessage = message.trim();
        if (trimmedMessage && !disabled) {
            onSend(trimmedMessage);
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={styles.chatInput}>
            <div className={styles.inputWrapper}>
                <textarea
                    className={styles.textarea}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    maxLength={2000}
                />
                <button
                    className={styles.sendButton}
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    aria-label='Send message'
                >
                    <svg
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    >
                        <line x1='22' y1='2' x2='11' y2='13' />
                        <polygon points='22 2 15 22 11 13 2 9 22 2' />
                    </svg>
                </button>
            </div>
            <div className={styles.hint}>
                Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line
            </div>
        </div>
    );
});
