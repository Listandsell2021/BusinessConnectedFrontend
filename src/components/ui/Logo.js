import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Common Logo component used across all authentication pages
 * Displays the Business Connected logo - light version for light theme, dark version for dark theme
 */
export default function Logo({ className = '' }) {
  const { isDark } = useTheme();

  const logoSrc = isDark
    ? '/Business-Connect-logoblacktheme.svg'
    : '/business-connected-logo.svg';

  return (
    <Link href="/" className={`flex items-center hover:opacity-75 transition-opacity flex-shrink-0 ${className}`}>
      <Image
        src={logoSrc}
        alt="Business Connected"
        width={170}
        height={50}
        priority
        className="w-32 h-auto sm:w-40 md:w-44 lg:w-48"
      />
    </Link>
  );
}
