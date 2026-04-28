// Browser entrypoint. Vite serves this as the first module loaded by
// index.html's <script type="module" src="/src/main.tsx">.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  // StrictMode double-invokes effects in dev to surface bugs like missing
  // cleanup. It's a no-op in production.
  <StrictMode>
    <App />
  </StrictMode>,
);
