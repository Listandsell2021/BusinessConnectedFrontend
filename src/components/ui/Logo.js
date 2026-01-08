import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Common Logo component used across all authentication pages
 * Displays the Business Connected logo
 */
export default function Logo({ className = '' }) {
  return (
    <Link href="/" className={`flex items-center hover:opacity-75 transition-opacity -ml-10 ${className}`}>
      <Image
        src="/business-connected-logo.svg"
        alt="Business Connected"
        width={170}
        height={50}
        priority
      />
    </Link>
  );
}
