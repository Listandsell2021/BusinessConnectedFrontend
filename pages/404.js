import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>404 - Page Not Found</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#f5f5f5' }}
      >
        <div className="text-center">
          <div
            className="text-8xl font-bold mb-6"
            style={{ color: '#333' }}
          >
            404
          </div>

          <h1 className="text-4xl font-bold mb-4" style={{ color: '#333' }}>
            Page Not Found
          </h1>

          <p className="text-lg mb-8" style={{ color: '#666' }}>
            Sorry, the page you are looking for does not exist.
          </p>

          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
