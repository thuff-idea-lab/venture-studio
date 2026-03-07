import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Venture Studio Dashboard',
  description: 'Review, approve, and queue venture studio projects for building',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}