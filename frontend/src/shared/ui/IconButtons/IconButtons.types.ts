export interface IconButtonProps {
    icon: 'camera' | 'settings' | 'x' | 'mic' | 'micOff' | 'headphones' | 'headphoneOff' | 'cast';
    size?: 'small' | 'medium' | 'large';
    variant?: 'filled' | 'outlined' | 'ghost';
    iconSize?: number;
    iconColor?: string;
    muted?: boolean;
    active?: boolean;
}
