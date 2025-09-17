import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated()) {
        // Redirect logged-in users to dashboard
        router.replace('/dashboard');
      } else {
        // Redirect non-logged-in users to login
        router.replace('/auth/login');
      }
    }
  }, [router, isAuthenticated, loading]);

  // Show loading spinner while checking auth and redirecting
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-text)' }}></div>
    </div>
  );
}