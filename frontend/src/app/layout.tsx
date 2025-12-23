/**
 * Root layout for Next.js app
 * This wraps all pages and provides global styles
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blog Creation System - Dograh',
  description: 'AI-Human collaborative blog creation system for SEO-optimized content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
