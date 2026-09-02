import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Value Vault — Pokémon Collection Tracker',
  description:
    'Track your Pokémon card inventory, market value, and set completion.',
  openGraph: {
    title: 'Value Vault',
    description: 'Pokémon collection tracking, made clear.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Value Vault',
    description: 'Pokémon collection tracking, made clear.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
