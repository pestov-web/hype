export const ru = {
    translation: {
        // Common
        common: {
            loading: 'Загрузка...',
            error: 'Ошибка',
            success: 'Успешно',
            cancel: 'Отмена',
            save: 'Сохранить',
            delete: 'Удалить',
            edit: 'Редактировать',
            send: 'Отправить',
            close: 'Закрыть',
            confirm: 'Подтвердить',
            back: 'Назад',
            next: 'Далее',
            or: 'или',
        },

        // Auth
        auth: {
            login: 'Войти',
            register: 'Зарегистрироваться',
            logout: 'Выход',
            email: 'Email',
            password: 'Пароль',
            username: 'Имя пользователя',
            alreadyHaveAccount: 'Уже есть аккаунт? Войди!',
            dontHaveAccount: 'Нужен аккаунт? Зарегистрируйся!',
            forgotPassword: 'Забыли пароль?',
            showPassword: 'Показать пароль',
            hidePassword: 'Скрыть пароль',
            loginSuccess: 'Вход выполнен успешно',
            registerSuccess: 'Регистрация выполнена успешно',
            loginError: 'Ошибка входа',
            registerError: 'Ошибка регистрации',
            welcome: 'Добро пожаловать!',
            welcomeBack: 'Мы так рады видеть тебя снова!',
            createAccount: 'Создать аккаунт',
            joinUs: 'Присоединяйся к нам!',
        },

        // Channels
        channels: {
            textChannels: 'Текстовые каналы',
            voiceChannels: 'Голосовые каналы',
            createChannel: 'Создать канал',
            channelName: 'Название канала',
            channelType: 'Тип канала',
            text: 'Текстовый',
            voice: 'Голосовой',
            deleteChannel: 'Удалить канал',
            editChannel: 'Редактировать канал',
        },

        // Messages
        messages: {
            typeMessage: 'Введите сообщение...',
            sendMessage: 'Отправить сообщение',
            editMessage: 'Редактировать сообщение',
            deleteMessage: 'Удалить сообщение',
            noMessages: 'Нет сообщений',
            loadingMessages: 'Загрузка сообщений...',
        },

        // Voice
        voice: {
            joinVoice: 'Подключиться к голосовому каналу',
            leaveVoice: 'Покинуть голосовой канал',
            mute: 'Выключить микрофон',
            unmute: 'Включить микрофон',
            deafen: 'Выключить звук',
            undeafen: 'Включить звук',
            shareScreen: 'Демонстрация экрана',
            stopSharing: 'Остановить демонстрацию',
            participants: 'Участники',
            noParticipants: 'Нет участников',
            speaking: 'Говорит',
            muted: 'Микрофон выключен',
            deafened: 'Звук выключен',
        },

        // Settings
        settings: {
            title: 'Настройки',
            profileSettings: 'Настройки профиля',
            userName: 'Имя пользователя',
            email: 'Email',
            changePassword: 'Изменить пароль',
            currentPassword: 'Текущий пароль',
            newPassword: 'Новый пароль',
            confirmNewPassword: 'Подтвердите новый пароль',
            saveChanges: 'Сохранить изменения',
            discardChanges: 'Отменить изменения',
            aboutMe: 'Обо мне',
            aboutMePlaceholder: 'Расскажите о себе...',
            account: 'Аккаунт',
            voiceVideo: 'Голос и видео',
            language: 'Язык',
            appearance: 'Внешний вид',
            notifications: 'Уведомления',

            // Voice & Video
            inputDevice: 'Устройство ввода',
            outputDevice: 'Устройство вывода',
            microphone: 'Микрофон',
            speakers: 'Динамики',
            camera: 'Камера',
            testMicrophone: 'Проверить микрофон',
            voiceMode: 'Режим активации микрофона',
            voiceModeNote: '',
            voiceModeDescription: 'Выберите, как должен активироваться ваш микрофон во время голосовых вызовов.',
            voiceActivityDetection: 'Голосовая активность (VAD)',
            voiceActivityDescription:
                'Автоматически определяет, когда вы говорите, с помощью машинного обучения. Отлично подходит для фильтрации фонового шума. Режим по умолчанию.',
            pushToTalk: 'Нажми и говори (PTT)',
            pushToTalkDescription:
                'Удерживайте клавишу, чтобы говорить. Идеально для шумных сред или групповых звонков.',
            pttKey: 'Клавиша PTT',
            currentPttKey: 'Текущая клавиша: ',
            pressToBind: 'Нажмите для привязки...',
            vadSensitivity: 'Чувствительность VAD',
            vadLow: 'Низкая (улавливает тихие звуки)',
            vadMedium: 'Средняя (сбалансированная)',
            vadHigh: 'Высокая (фильтрует шум)',

            // Language
            selectLanguage: 'Выберите язык',
            russian: 'Русский',
            english: 'English',
        },

        // Users
        users: {
            online: 'В сети',
            offline: 'Не в сети',
            away: 'Отошёл',
            dnd: 'Не беспокоить',
            members: 'Участники',
            onlineCount: 'В сети — {{count}}',
            offlineCount: 'Не в сети — {{count}}',
        },

        // Home
        home: {
            welcome: 'Добро пожаловать в Hype',
            selectChannel: 'Выберите канал для начала',
            noChannels: 'Нет доступных каналов',
        },
    },
};
