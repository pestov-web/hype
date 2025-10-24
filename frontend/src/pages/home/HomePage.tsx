import { observer } from 'mobx-react-lite';
import { ChannelSidebar } from '@widgets/channel-sidebar';
import { MembersList } from '@widgets/members-list';
import { GuestLoginDialog, useGuestLogin } from '@features/auth';
import { useAppInitialization } from '@features/app-initialization';
import { useTranslation } from '@shared/lib';
import styles from './HomePage.module.scss';

export const HomePage = observer(() => {
    // Features
    const { showDialog, setShowDialog } = useGuestLogin();
    const { isLoading, error } = useAppInitialization();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <p>{t('common.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p>
                    {t('common.error')}: {error}
                </p>
            </div>
        );
    }

    return (
        <div className={styles.homePage}>
            <GuestLoginDialog open={showDialog} onOpenChange={setShowDialog} />

            <ChannelSidebar />

            {/* Правая панель - основной контент */}
            <div className={styles.mainContent}>
                <div className={styles.welcomeMessage}>
                    <h1>{t('home.welcome')}</h1>
                    <p>{t('home.selectChannel')}</p>
                </div>
            </div>

            {/* Список участников справа */}
            <MembersList />
        </div>
    );
});
