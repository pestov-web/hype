import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@shared/lib/utils/cn';
import styles from './Avatar.module.scss';

type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
    src?: string;
    alt?: string;
    username?: string;
    status?: UserStatus;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showStatus?: boolean;
}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
    ({ className, src, alt, username, status, size = 'md', showStatus = true, ...props }, ref) => {
        const sizeClass = styles[size];
        const statusClass = status ? styles[`status${status.charAt(0).toUpperCase()}${status.slice(1)}`] : '';

        return (
            <div className={cn(styles.wrapper, sizeClass, className)}>
                <AvatarPrimitive.Root ref={ref} className={styles.root} {...props}>
                    <AvatarPrimitive.Image className={styles.image} src={src} alt={alt || username || 'Avatar'} />
                    <AvatarPrimitive.Fallback className={styles.fallback}>
                        {username?.[0]?.toUpperCase() || '?'}
                    </AvatarPrimitive.Fallback>
                </AvatarPrimitive.Root>
                {showStatus && status && <span className={cn(styles.statusIndicator, statusClass)} />}
            </div>
        );
    }
);

Avatar.displayName = 'Avatar';

export { Avatar };
