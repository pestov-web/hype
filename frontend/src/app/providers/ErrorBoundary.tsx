import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.scss';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        // Reload the page
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.errorBoundary}>
                    <div className={styles.errorContainer}>
                        <div className={styles.errorHeader}>
                            <svg
                                className={styles.errorIcon}
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                            >
                                <circle cx='12' cy='12' r='10' />
                                <line x1='12' y1='8' x2='12' y2='12' />
                                <line x1='12' y1='16' x2='12.01' y2='16' />
                            </svg>
                            <h1>Oops! Something went wrong</h1>
                        </div>

                        <div className={styles.errorMessage}>
                            <h2>Error Details:</h2>
                            <pre className={styles.errorText}>{this.state.error?.toString()}</pre>
                        </div>

                        {this.state.errorInfo && (
                            <details className={styles.errorStack}>
                                <summary>Component Stack Trace</summary>
                                <pre>{this.state.errorInfo.componentStack}</pre>
                            </details>
                        )}

                        {this.state.error?.stack && (
                            <details className={styles.errorStack}>
                                <summary>Full Stack Trace</summary>
                                <pre>{this.state.error.stack}</pre>
                            </details>
                        )}

                        <div className={styles.errorActions}>
                            <button onClick={this.handleReset} className={styles.resetButton}>
                                Reload Application
                            </button>
                            <button onClick={() => window.history.back()} className={styles.backButton}>
                                Go Back
                            </button>
                        </div>

                        <div className={styles.errorTips}>
                            <h3>Troubleshooting Tips:</h3>
                            <ul>
                                <li>Try refreshing the page</li>
                                <li>Clear your browser cache</li>
                                <li>Check the browser console for more details</li>
                                <li>If the problem persists, contact support</li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
