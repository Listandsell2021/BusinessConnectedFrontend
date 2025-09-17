import '../src/styles/globals.css';
import '../src/styles/react-datepicker-theme.css';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { ServiceProvider } from '../src/contexts/ServiceContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <LanguageProvider>
        <ThemeProvider>
          <ServiceProvider>
            <AuthProvider>
              <NotificationProvider>
                <Component {...pageProps} />
              </NotificationProvider>
              
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--theme-card-bg)',
                    color: 'var(--theme-text)',
                    border: '1px solid var(--theme-border)',
                    boxShadow: '0 4px 12px var(--theme-shadow)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#FFFFFF',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#FFFFFF',
                    },
                  },
                }}
              />
            </AuthProvider>
          </ServiceProvider>
        </ThemeProvider>
      </LanguageProvider>
    </>
  );
}