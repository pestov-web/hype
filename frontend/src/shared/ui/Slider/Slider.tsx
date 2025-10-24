import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@shared/lib';
import styles from './Slider.module.scss';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
    disabled?: boolean;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, className, disabled }: SliderProps) {
    return (
        <SliderPrimitive.Root
            className={cn(styles.root, className)}
            value={[value]}
            onValueChange={(values) => onChange(values[0])}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
        >
            <SliderPrimitive.Track className={styles.track}>
                <SliderPrimitive.Range className={styles.range} />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className={styles.thumb} />
        </SliderPrimitive.Root>
    );
}
