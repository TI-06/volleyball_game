import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/app.css';
import './styles/match.css';
import './styles/rework-menu.css';
import './styles/rework-match.css';
import './styles/feedback.css';
import './styles/orientation.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element #root was not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
