import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './shared/i18n/config'; // Initialize i18n
import App from './app/App.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
