# SCSS Variables Reference

## Полный список переменных для проекта Hype

### Цвета

#### Primary Colors

-   `$primary: #5865f2` - основной цвет (Discord blue)
-   `$primary-hover: #4752c4` - при наведении
-   `$primary-active: #3c45a5` - при нажатии

#### Secondary Colors

-   `$secondary: #4f545c` - вторичный цвет
-   `$secondary-hover: #686d73`
-   `$secondary-active: #5c6269`

#### Status Colors

-   `$danger: #ed4245` - ошибки, удаление
-   `$danger-hover: #c03537`
-   `$danger-active: #a12d2f`
-   `$success: #3ba55d` - успех
-   `$warning: #faa81a` - предупреждения

#### Background Colors

-   `$bg-primary: #36393f` - основной фон
-   `$bg-secondary: #2f3136` - вторичный фон (sidebar)
-   `$bg-tertiary: #202225` - третичный фон (footer, darker areas)
-   `$bg-modifier: #40444b` - модификатор
-   `$bg-modifier-hover: #4f545c` - модификатор при наведении
-   `$bg-hover: rgba(79, 84, 92, 0.16)` - hover состояние
-   `$bg-active: rgba(79, 84, 92, 0.24)` - active состояние

#### Border Colors

-   `$border-color: rgba(0, 0, 0, 0.2)` - основная граница
-   `$border-hover: rgba(0, 0, 0, 0.3)` - граница при наведении

#### Text Colors

-   `$text-primary: #ffffff` - основной текст (заголовки)
-   `$text-secondary: #b9bbbe` - вторичный текст
-   `$text-tertiary: #8e9297` - третичный текст (labels)
-   `$text-normal: #dcddde` - обычный текст
-   `$text-muted: #72767d` - приглушенный текст
-   `$text-link: #00aff4` - ссылки
-   `$text-positive: #3ba55d` - позитивный текст
-   `$text-warning: #faa81a` - предупреждающий текст
-   `$text-danger: #ed4245` - текст ошибки

#### Header Colors

-   `$header-primary: #ffffff` - заголовки основные
-   `$header-secondary: #b9bbbe` - заголовки вторичные

#### Interactive Colors

-   `$interactive-normal: #b9bbbe` - интерактивный элемент
-   `$interactive-hover: #dcddde` - при наведении
-   `$interactive-active: #ffffff` - при нажатии
-   `$interactive-muted: #4f545c` - приглушенный

#### Status Indicators

-   `$status-online: #3ba55d` - онлайн
-   `$status-idle: #faa81a` - отошел
-   `$status-dnd: #ed4245` - не беспокоить
-   `$status-offline: #747f8d` - оффлайн

### Размеры

#### Spacing

-   `$spacing-xs: 4px` - extra small
-   `$spacing-sm: 8px` - small
-   `$spacing-md: 12px` - medium
-   `$spacing-lg: 16px` - large
-   `$spacing-xl: 20px` - extra large
-   `$spacing-xxl: 24px` - extra extra large

#### Border Radius

-   `$border-radius-sm: 4px` - small radius
-   `$border-radius-md: 8px` - medium radius
-   `$border-radius-lg: 12px` - large radius
-   `$border-radius-round: 50%` - круглый элемент

### Типография

#### Font Sizes

-   `$font-size-xs: 12px` - extra small
-   `$font-size-sm: 14px` - small
-   `$font-size-md: 16px` - medium (базовый)
-   `$font-size-lg: 18px` - large
-   `$font-size-xl: 20px` - extra large
-   `$font-size-xxl: 24px` - extra extra large

#### Font Weights

-   `$font-weight-normal: 400` - обычный
-   `$font-weight-medium: 500` - средний
-   `$font-weight-semibold: 600` - полужирный
-   `$font-weight-bold: 700` - жирный

### Анимации

#### Transitions

-   `$transition-fast: 0.1s ease` - быстрая анимация
-   `$transition-normal: 0.2s ease` - обычная анимация
-   `$transition-slow: 0.3s ease` - медленная анимация

### Z-Index

#### Layers

-   `$z-dropdown: 1000` - выпадающие меню
-   `$z-modal: 2000` - модальные окна
-   `$z-tooltip: 3000` - подсказки

## Использование

### В SCSS файлах

```scss
@use '@shared/styles/variables' as *;

.myClass {
    background-color: $bg-primary;
    color: $text-primary;
    padding: $spacing-md;
    border-radius: $border-radius-sm;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    transition: $transition-normal;
}
```

### С миксинами

```scss
@use '@shared/styles/variables' as *;
@use '@shared/styles/mixins' as *;

.myComponent {
    @include flex-center;
    @include card;
    @include custom-scrollbar;

    background: $bg-secondary;
    border-radius: $border-radius-md;
}
```

## Соглашения об именовании

1. **Цвета**: `$category-modifier` (например, `$text-primary`, `$bg-hover`)
2. **Размеры**: `$category-size` (например, `$spacing-md`, `$font-size-lg`)
3. **Радиусы**: `$border-radius-size` (например, `$border-radius-sm`)
4. **Веса шрифтов**: `$font-weight-name` (например, `$font-weight-bold`)
5. **Переходы**: `$transition-speed` (например, `$transition-fast`)

## Deprecated (НЕ ИСПОЛЬЗОВАТЬ)

❌ `$font-xs`, `$font-sm`, `$font-md`, `$font-lg`, `$font-xl`, `$font-xxl`  
✅ Используйте `$font-size-xs`, `$font-size-sm`, и т.д.

❌ `$font-normal`, `$font-medium`, `$font-semibold`, `$font-bold`  
✅ Используйте `$font-weight-normal`, `$font-weight-medium`, и т.д.

❌ `$radius-sm`, `$radius-md`, `$radius-lg`, `$radius-round`  
✅ Используйте `$border-radius-sm`, `$border-radius-md`, и т.д.
