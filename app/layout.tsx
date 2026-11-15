import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'GameVault — Архив игровых скриншотов',
  description: 'Личный облачный архив для хранения игровых скриншотов в высоком качестве',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0a0c10] text-white antialiased`}>
        <Header />
        <main>{children}</main>
        <footer className="mt-16 border-t border-white/5 py-6 text-center text-xs text-white/20">
          GameVault — личный архив скриншотов
        </footer>
      </body>
    </html>
  );
}
