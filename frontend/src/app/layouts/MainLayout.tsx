import { observer } from 'mobx-react-lite';
import { Outlet } from 'react-router-dom';
import { ServerSidebar } from '@widgets/server-sidebar';
import { VoiceAudioManager } from '@widgets/voice-panel/VoiceAudioManager';
import { UserProfilePanel } from '@widgets/user-profile-panel';
import { useWebSocketConnection } from '@features/websocket';
import styles from './MainLayout.module.scss';

export const MainLayout = observer(() => {
    useWebSocketConnection();

    return (
        <div className={styles.layout}>
            {/* Global audio manager for WebRTC */}
            <VoiceAudioManager />

            {/* Левая панель со списком серверов (72px) */}
            <ServerSidebar />

            {/* Средняя панель с каналами сервера + основной контент */}
            <div className={styles.channelsContainer}>
                {/* Здесь будет рендериться контент страниц через Outlet */}
                {/* Outlet включает ChannelSidebar (с UserPanel внизу) + Chat/другой контент */}
                <Outlet />
            </div>

            {/* Панель профиля пользователя (фиксированная внизу слева, видна на всех страницах) */}
            <UserProfilePanel />
        </div>
    );
});
