import { AppProvider } from './providers/AppProvider';
import { ErrorBoundary } from './providers';
import { AppRouter } from './router';
import './App.css';

function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <AppRouter />
            </AppProvider>
        </ErrorBoundary>
    );
}

export default App;
