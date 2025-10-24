import { Camera, Settings, X, Mic, MicOff, Headphones, HeadphoneOff, Cast } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import React from 'react';

import style from './IconButtons.module.scss';
import type { IconButtonProps } from './IconButtons.types';

const iconMap: Record<string, LucideIcon> = {
    camera: Camera,
    settings: Settings,
    x: X,
    mic: Mic,
    micOff: MicOff,
    headphones: Headphones,
    headphoneOff: HeadphoneOff,
    cast: Cast,
};
export const IconButton: React.FC<IconButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
    icon,
    iconSize = 20,
    iconColor = '#b9bbbe',
    ...props
}) => {
    const IconComponent = iconMap[icon];
    if (!IconComponent) {
        console.warn(`Icon "${icon}" not found in iconMap.`);
        return null;
    }
    return (
        <button
            className={`${style.iconButton} ${props.muted ? style.muted : ''} ${props.active ? style.active : ''}`}
            {...props}
        >
            <IconComponent size={iconSize} color={iconColor} />
        </button>
    );
};
