import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@shared/ui';
import { useAuthStore } from '@shared/lib/hooks/useStores';
import styles from './GuestLoginDialog.module.scss';

interface GuestLoginDialogProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
}

export const GuestLoginDialog = observer(({ open, onOpenChange }: GuestLoginDialogProps) => {
    const authStore = useAuthStore();
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim()) {
            setError('Пожалуйста, введите никнейм');
            return;
        }

        if (username.length < 3) {
            setError('Никнейм должен быть не менее 3 символов');
            return;
        }

        if (username.length > 32) {
            setError('Никнейм не должен превышать 32 символа');
            return;
        }

        // Mock login with guest username
        authStore.setCurrentUser({
            id: `guest-${Date.now()}`,
            username: username.trim(),
            email: null,
            isGuest: true,
            displayName: null,
            avatarUrl: null,
            bio: null,
            customStatus: null,
            status: 'ONLINE',
            isOnline: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        setError('');
        onOpenChange?.(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <Dialog.Title className={styles.title}>Добро пожаловать в Hype! 👋</Dialog.Title>

                    <Dialog.Description className={styles.description}>
                        Войдите как гость, чтобы начать общение. Позже вы сможете создать постоянный аккаунт.
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label htmlFor='username' className={styles.label}>
                                Никнейм
                            </label>
                            <input
                                id='username'
                                type='text'
                                className={styles.input}
                                placeholder='Введите никнейм...'
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                                maxLength={32}
                            />
                            {error && <span className={styles.error}>{error}</span>}
                        </div>

                        <div className={styles.actions}>
                            <Button type='submit' variant='primary' style={{ width: '100%' }}>
                                Войти как гость
                            </Button>
                        </div>

                        <div className={styles.divider}>
                            <span>или</span>
                        </div>

                        <div className={styles.authOptions}>
                            <Button type='button' variant='secondary' style={{ width: '100%' }} disabled>
                                Войти через Discord (скоро)
                            </Button>
                            <Button type='button' variant='secondary' style={{ width: '100%' }} disabled>
                                Создать аккаунт (скоро)
                            </Button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button className={styles.closeButton} aria-label='Закрыть'>
                            ✕
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
});
