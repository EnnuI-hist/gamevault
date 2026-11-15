import type { Metadata } from 'next';
import { Manrope, Unbounded, Orbitron, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
});

const unbounded = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-unbounded',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Game archive EnnuI — Игровой архив и трекер бэклога',
  description: 'Личный облачный архив скриншотов, сохранений и трекер прохождения игр EnnuI',
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
      className={`dark ${manrope.variable} ${unbounded.variable} ${orbitron.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={`${manrope.className} min-h-screen bg-[#07090e] text-white antialiased selection:bg-cyan-500/30 selection:text-cyan-200`}
      >
        <Header />
        <main>{children}</main>
        <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-white/35 font-mono">
          <div className="flex items-center justify-center gap-2">
            <span>Game archive</span>
            <span className="font-orbitron font-bold tracking-wider text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.7)]">
              EnnuI
            </span>
            <span>•</span>
            <span>Личный игровой архив и трекер</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
