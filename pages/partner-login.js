import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';

export default function PartnerLogin() {
  const router = useRouter();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Redirect to home page which now displays partner login
      router.replace('/');
    }
  }, [loading, router]);

  // Show loading spinner while redirecting
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--theme-text)' }}></div>
    </div>
  );
}

// Force server-side rendering
export async function getServerSideProps() {
  return {
    props: {}
  };
}
