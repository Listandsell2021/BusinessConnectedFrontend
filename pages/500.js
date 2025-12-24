import React from 'react';
import Link from 'next/link';

export default function ServerError() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: 'var(--theme-bg, #ffffff)',
      color: 'var(--theme-text, #000000)'
    }}>
      <h1 style={{ fontSize: '72px', margin: '0 0 20px 0' }}>500</h1>
      <p style={{ fontSize: '24px', margin: '0 0 30px 0' }}>Server error</p>
      <Link href="/">
        <button style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: 'var(--theme-primary, #3b82f6)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Go back home
        </button>
      </Link>
    </div>
  );
}
