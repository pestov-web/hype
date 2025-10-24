import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Avatar } from '@shared/ui';
import { rootStore } from '@app/stores';
import styles from './MembersList.module.scss';

export const MembersList = observer(() => {
    const { users: usersStore, voice: voiceStore } = rootStore;

    useEffect(() => {
        console.log('📋 MembersList mounted, loading users...');
        usersStore.loadUsers();
    }, [usersStore]);

    console.log('📋 MembersList render:', {
        isLoading: usersStore.isLoading,
        error: usersStore.error,
        usersCount: usersStore.users.length,
        onlineCount: usersStore.onlineUsers.length,
        offlineCount: usersStore.offlineUsers.length,
    });

    if (usersStore.isLoading) {
        return (
            <div className={styles.membersList}>
                <div className={styles.loading}>Loading members...</div>
            </div>
        );
    }

    if (usersStore.error) {
        return (
            <div className={styles.membersList}>
                <div className={styles.error}>{usersStore.error}</div>
            </div>
        );
    }

    const onlineUsers = usersStore.onlineUsers;
    const offlineUsers = usersStore.offlineUsers;

    // Debug: log participants map
    console.log('📋 MembersList participants:', {
        participantsCount: voiceStore.participants.size,
        participants: Array.from(voiceStore.participants.entries()).map(([userId, p]) => ({
            userId,
            username: p.username,
            speaking: p.speaking,
            channelId: p.channelId,
        })),
        activeChannelId: voiceStore.activeVoiceChannelId,
    });

    // Helper function to check if user is speaking in voice channel
    const isUserSpeaking = (userId: string): boolean => {
        const participant = voiceStore.participants.get(userId);
        const speaking = participant?.speaking || false;

        // Debug log
        if (speaking) {
            console.log('🎤 MembersList: User is speaking:', {
                userId,
                username: participant?.username,
                speaking,
            });
        }

        return speaking;
    };

    return (
        <div className={styles.membersList}>
            {/* Online members */}
            {onlineUsers.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>Online — {onlineUsers.length}</div>
                    <div className={styles.membersList}>
                        {onlineUsers.map((user) => {
                            const isSpeaking = isUserSpeaking(user.id);

                            // Debug log for each user
                            console.log(`👤 Rendering user ${user.username}:`, {
                                userId: user.id,
                                isSpeaking,
                                participant: voiceStore.participants.get(user.id),
                            });

                            return (
                                <div key={user.id} className={styles.member}>
                                    <div className={styles.avatarWrapper}>
                                        <Avatar
                                            username={user.username}
                                            src={user.avatarUrl || undefined}
                                            status={user.status.toLowerCase() as 'online' | 'idle' | 'dnd' | 'offline'}
                                            size='md'
                                        />
                                        {isSpeaking && (
                                            <div
                                                className={styles.speakingIndicator}
                                                style={{ border: '3px solid lime' }}
                                            />
                                        )}
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <div className={styles.memberName}>{user.displayName || user.username}</div>
                                        {user.customStatus && (
                                            <div className={styles.memberStatus}>{user.customStatus}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Offline members */}
            {offlineUsers.length > 0 && (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>Offline — {offlineUsers.length}</div>
                    <div className={styles.membersList}>
                        {offlineUsers.map((user) => (
                            <div key={user.id} className={styles.member}>
                                <Avatar
                                    username={user.username}
                                    src={user.avatarUrl || undefined}
                                    status='offline'
                                    size='md'
                                />
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberName}>{user.displayName || user.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {onlineUsers.length === 0 && offlineUsers.length === 0 && (
                <div className={styles.empty}>No members found</div>
            )}
        </div>
    );
});
