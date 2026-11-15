import type { Metadata } from 'next';
import { Manrope, Unbounded, Orbitron, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BackgroundWallpaper from '@/components/BackgroundWallpaper';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { BackgroundProvider } from '@/lib/context/BackgroundContext';

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
        <link rel="preconnect" href="https://husdzyczmhkkpgxhndvw.supabase.co" crossOrigin="" />
        <link rel="dns-prefetch" href="https://husdzyczmhkkpgxhndvw.supabase.co" />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var t = localStorage.getItem('gamevault_theme') || 'cyan';
                document.documentElement.setAttribute('data-theme', t);
                var b = localStorage.getItem('gamevault_bg') || 'cyber-grid';
                document.documentElement.setAttribute('data-bg', b);
              } catch(e){}
            })()`,
          }}
        />
      </head>
      <body
        className={`${manrope.className} min-h-screen bg-[#07090e] text-white antialiased relative`}
      >
        <ThemeProvider>
          <BackgroundProvider>
            <BackgroundWallpaper />
            <Header />
            <main className="relative z-0">{children}</main>
            <footer className="mt-16 border-t border-white/5 py-8 text-center text-xs text-white/35 font-mono relative z-0">
              <div className="flex items-center justify-center gap-2">
                <span>Game archive</span>
                <span className="font-orbitron font-bold tracking-wider text-[var(--neon-text)] drop-shadow-[0_0_8px_rgba(var(--neon-primary-rgb),0.7)]">
                  EnnuI
                </span>
                <span>•</span>
                <span>Личный игровой архив и трекер</span>
              </div>
            </footer>
          </BackgroundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
