import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { rootStore } from '@app/stores';
import Button from '@shared/ui/Button/Button';
import styles from './LoginPage.module.scss';
import { useTranslation } from '@shared/i18n';

export const LoginPage = observer(() => {
    /**
     * Объект навигации React Router
     */
    const navigate = useNavigate();

    /**
     * Объект хранилища аутентификации
     */
    const { auth: authStore } = rootStore;

    /**
     * Объект локализации
     */
    const { t } = useTranslation();

    /**
     * Состояние формы
     */
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isLogin) {
            console.log('Login attempt:', { email, password: password.length + ' chars' });
            const result = await authStore.login({ email, password });
            console.log('Login result:', result);
            if (result.success) {
                navigate('/');
            }
        } else {
            console.log('Register attempt:', { username, email, password: password.length + ' chars' });
            const result = await authStore.register({ username, email, password });
            console.log('Register result:', result);
            if (result.success) {
                navigate('/');
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>{isLogin ? t('auth.welcome') : t('auth.createAccount')}</h1>
                <p className={styles.subtitle}>{isLogin ? t('auth.welcomeBack') : t('auth.joinUs')}</p>

                {authStore.error && (
                    <div className={styles.error}>
                        <div>{authStore.error}</div>
                        {isLogin && authStore.error.includes('Invalid') && (
                            <div className={styles.errorHint}>
                                Проверьте правильность email и пароля. Или{' '}
                                <button type='button' className={styles.inlineLink} onClick={() => setIsLogin(false)}>
                                    зарегистрируйтесь
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {!isLogin && (
                        <div className={styles.field}>
                            <label htmlFor='username' className={styles.label}>
                                {t('auth.username')}
                            </label>
                            <input
                                id='username'
                                type='text'
                                className={styles.input}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder='Введите имя пользователя'
                                required
                                minLength={3}
                                maxLength={32}
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <label htmlFor='email' className={styles.label}>
                            {t('auth.email')}
                        </label>
                        <input
                            id='email'
                            type='email'
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='Введите email'
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor='password' className={styles.label}>
                            {t('auth.password')}
                        </label>
                        <div className={styles.passwordField}>
                            <input
                                id='password'
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder='Введите пароль'
                                required
                                minLength={8}
                            />
                            <button
                                type='button'
                                className={styles.passwordToggle}
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    <Button
                        type='submit'
                        variant='primary'
                        className={styles.submitButton}
                        disabled={authStore.isLoading}
                    >
                        {authStore.isLoading ? t('common.loading') : isLogin ? t('auth.login') : t('auth.register')}
                    </Button>
                </form>

                <div className={styles.divider}>
                    <span>{t('common.or')}</span>
                </div>
                <div className={styles.authOptions}>
                    <Button type='button' variant='secondary' style={{ width: '100%' }} disabled>
                        Войти через Discord (скоро)
                    </Button>
                    <Button type='button' variant='secondary' style={{ width: '100%' }} disabled>
                        Войти через Google (скоро)
                    </Button>
                </div>
                <div className={styles.footer}>
                    <button type='button' className={styles.link} onClick={() => setIsLogin(!isLogin)}>
                        {isLogin ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
                    </button>
                </div>
            </div>
        </div>
    );
});
