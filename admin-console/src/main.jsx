import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, RoleProvider, ThemeProvider, ToastProvider } from './hooks.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import App from './App.jsx';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <RoleProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </RoleProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
