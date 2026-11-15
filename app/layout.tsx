import type { Metadata } from 'next';
import { Inter, Cinzel, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GameVault — Тёмный фэнтези лаунчер и игровой архив',
  description: 'Личный облачный архив для хранения скриншотов, сохранений и бэклога игр в эстетике тёмного фэнтези',
  other: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`dark ${inter.variable} ${cinzel.variable} ${cormorant.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#07090e] text-white antialiased selection:bg-amber-500/30 selection:text-amber-200`}>
        <Header />
        <main>{children}</main>
        <footer className="mt-16 border-t border-white/5 py-6 text-center text-xs text-white/30 font-mono">
          GameVault • Dark Fantasy Game Vault & Tracker
        </footer>
      </body>
    </html>
  );
}
