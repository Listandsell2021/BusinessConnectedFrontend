import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Common Logo component used across all authentication pages
 * Displays the Umzug Anbieter Vergleich logo with theme-aware switching
 */
export default function Logo({ className = '' }) {
  const { isDark } = useTheme();

  return (
    <Link href="/" className={`flex items-center hover:opacity-75 transition-opacity -ml-16 ${className}`}>
      <Image
        src={isDark ? "/logo-dark.svg" : "/logo-light.svg"}
        alt="Umzug Anbieter Vergleich"
        width={260}
        height={75}
        priority
      />
    </Link>
  );
}
