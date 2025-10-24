import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import styles from './ServerSidebar.module.scss';

interface Server {
    id: string;
    name: string;
    iconUrl?: string;
}

/**
 * ServerSidebar - левая панель со списком серверов (как в Discord)
 * Показывает:
 * - Home кнопку (DM)
 * - Список серверов с иконками
 * - Кнопку создания сервера (только для не-гостей)
 */
export const ServerSidebar = observer(() => {
    const navigate = useNavigate();

    // TODO: Получать список серверов из store
    const servers: Server[] = []; // Пока пусто

    const handleHomeClick = () => {
        navigate('/');
    };

    const handleServerClick = (serverId: string) => {
        navigate(`/servers/${serverId}`);
    };

    const handleCreateServer = () => {
        // TODO: Открыть модалку создания сервера
        console.log('Create server');
    };

    return (
        <div className={styles.serverSidebar}>
            {/* Home button - Cat face logo =(^.^)= */}
            <div className={styles.serverItem} onClick={handleHomeClick}>
                <div className={styles.serverIcon}>
                    <svg width='32' height='32' viewBox='0 0 32 32' fill='currentColor'>
                        {/* Cat ears */}
                        <path d='M4 8 L8 4 L10 10 Z' />
                        <path d='M28 8 L24 4 L22 10 Z' />
                        {/* Cat face circle */}
                        <circle cx='16' cy='16' r='10' fill='currentColor' />
                        {/* Eyes (^.^) */}
                        <path
                            d='M11 14 L12 15 L13 14'
                            stroke='#2f3136'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            fill='none'
                        />
                        <path
                            d='M19 14 L20 15 L21 14'
                            stroke='#2f3136'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            fill='none'
                        />
                        {/* Nose */}
                        <circle cx='16' cy='17' r='1' fill='#2f3136' />
                        {/* Mouth (smile) */}
                        <path
                            d='M14 19 Q16 20.5 18 19'
                            stroke='#2f3136'
                            strokeWidth='1.2'
                            strokeLinecap='round'
                            fill='none'
                        />
                        {/* Whiskers */}
                        <line x1='8' y1='16' x2='11' y2='16' stroke='#2f3136' strokeWidth='1' />
                        <line x1='8' y1='18' x2='11' y2='17.5' stroke='#2f3136' strokeWidth='1' />
                        <line x1='21' y1='16' x2='24' y2='16' stroke='#2f3136' strokeWidth='1' />
                        <line x1='21' y1='17.5' x2='24' y2='18' stroke='#2f3136' strokeWidth='1' />
                    </svg>
                </div>
            </div>

            <div className={styles.separator} />

            {/* Server list */}
            {servers.map((server) => (
                <div key={server.id} className={styles.serverItem} onClick={() => handleServerClick(server.id)}>
                    <div className={styles.serverIcon}>
                        {server.iconUrl ? (
                            <img src={server.iconUrl} alt={server.name} />
                        ) : (
                            <span>{server.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                </div>
            ))}

            {/* Create server button */}
            <div className={styles.serverItem} onClick={handleCreateServer}>
                <div className={`${styles.serverIcon} ${styles.createServer}`}>
                    <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
                        <path d='M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z' />
                    </svg>
                </div>
            </div>
        </div>
    );
});
