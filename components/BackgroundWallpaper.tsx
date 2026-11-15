'use client';

import React, { useMemo } from 'react';
import { useBackground, BackgroundId } from '@/lib/context/BackgroundContext';

// Фиксированный детерминированный набор звёзд для режима Nebula Abyss (без расхождений при гидратации)
const STARS = [
  { top: '8%', left: '12%', size: 1.5, delay: '0s', dur: '3.5s' },
  { top: '15%', left: '28%', size: 2, delay: '1.2s', dur: '4.2s' },
  { top: '12%', left: '68%', size: 1, delay: '0.4s', dur: '3.8s' },
  { top: '22%', left: '84%', size: 2.5, delay: '2.1s', dur: '4.5s' },
  { top: '28%', left: '42%', size: 1.5, delay: '1.7s', dur: '3.2s' },
  { top: '35%', left: '18%', size: 2, delay: '0.9s', dur: '4.0s' },
  { top: '32%', left: '92%', size: 1, delay: '2.8s', dur: '3.6s' },
  { top: '44%', left: '55%', size: 2, delay: '1.5s', dur: '4.8s' },
  { top: '48%', left: '76%', size: 1.5, delay: '0.3s', dur: '3.4s' },
  { top: '56%', left: '8%', size: 2, delay: '2.4s', dur: '4.1s' },
  { top: '58%', left: '34%', size: 1, delay: '1.1s', dur: '3.7s' },
  { top: '64%', left: '88%', size: 2, delay: '0.7s', dur: '4.3s' },
  { top: '68%', left: '62%', size: 1.5, delay: '2.2s', dur: '3.9s' },
  { top: '74%', left: '22%', size: 2, delay: '1.8s', dur: '4.6s' },
  { top: '78%', left: '48%', size: 1, delay: '0.5s', dur: '3.3s' },
  { top: '82%', left: '79%', size: 2, delay: '2.6s', dur: '4.4s' },
  { top: '88%', left: '15%', size: 1.5, delay: '1.4s', dur: '3.6s' },
  { top: '92%', left: '65%', size: 2, delay: '0.8s', dur: '4.2s' },
  { top: '18%', left: '50%', size: 1, delay: '2.0s', dur: '3.5s' },
  { top: '26%', left: '6%', size: 2, delay: '1.6s', dur: '4.7s' },
  { top: '38%', left: '72%', size: 1.5, delay: '0.2s', dur: '3.1s' },
  { top: '50%', left: '25%', size: 2, delay: '2.5s', dur: '4.0s' },
  { top: '62%', left: '45%', size: 1, delay: '1.3s', dur: '3.8s' },
  { top: '72%', left: '94%', size: 2, delay: '0.6s', dur: '4.4s' },
  { top: '85%', left: '38%', size: 1.5, delay: '2.3s', dur: '3.9s' },
  { top: '6%', left: '82%', size: 1, delay: '1.9s', dur: '3.7s' },
  { top: '14%', left: '95%', size: 2, delay: '0.4s', dur: '4.1s' },
  { top: '42%', left: '3%', size: 1.5, delay: '2.7s', dur: '4.3s' },
];

export default function BackgroundWallpaper() {
  const { background } = useBackground();

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden select-none bg-[#07090e]"
    >
      {/* 1. Cyber Grid (По умолчанию): Перспективная 3D сетка, дымка и неоновые световые пятна */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          background === 'cyber-grid' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Верхнее мягкое свечение в тоне темы */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[900px] rounded-full blur-[120px] opacity-25"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(var(--neon-primary-rgb), 0.5) 0%, rgba(var(--neon-secondary-rgb), 0.2) 45%, transparent 75%)',
          }}
        />

        {/* Световые пятна по бокам */}
        <div
          className="absolute top-1/3 -left-48 h-96 w-96 rounded-full blur-[100px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(var(--neon-primary-rgb), 0.6) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-1/2 -right-48 h-96 w-96 rounded-full blur-[110px] opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(var(--neon-secondary-rgb), 0.5) 0%, transparent 70%)',
          }}
        />

        {/* Горизонтальная световая дымка над сеткой */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[48vh] opacity-35"
          style={{
            background:
              'radial-gradient(ellipse 90% 55% at 50% 90%, rgba(var(--neon-primary-rgb), 0.35) 0%, rgba(var(--neon-secondary-rgb), 0.15) 45%, transparent 80%)',
          }}
        />

        {/* 3D Перспективная неоновая сетка */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[52vh] overflow-hidden"
          style={{
            perspective: '450px',
            perspectiveOrigin: '50% 10%',
          }}
        >
          <div
            className="absolute -left-[30%] -right-[30%] -bottom-10 h-[150%]"
            style={{
              transform: 'rotateX(72deg)',
              transformOrigin: '50% 100%',
              backgroundImage: `
                linear-gradient(to right, rgba(var(--neon-primary-rgb), 0.28) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(var(--neon-primary-rgb), 0.28) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
              animation: 'cyberGridScroll 16s linear infinite',
              maskImage:
                'linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0.6) 55%, transparent 92%)',
              WebkitMaskImage:
                'linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0.6) 55%, transparent 92%)',
            }}
          />

          {/* Тонкий горизонт с неоновым свечением */}
          <div
            className="absolute top-0 left-0 right-0 h-[1px] opacity-40"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(var(--neon-primary-rgb), 0.8) 50%, transparent 100%)',
              boxShadow: '0 0 16px rgba(var(--neon-primary-rgb), 0.7)',
            }}
          />
        </div>
      </div>

      {/* 2. Nebula Abyss: Глубокий космический градиент, пульсирующие туманности и звёзды */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          background === 'nebula-abyss' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Базовый глубокий космический градиент */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#090d18] via-[#060810] to-[#040509]" />

        {/* Пульсирующая туманность 1 (Основной неон) */}
        <div
          className="absolute -top-24 -left-24 h-[650px] w-[650px] rounded-full blur-[90px]"
          style={{
            background:
              'radial-gradient(circle, rgba(var(--neon-primary-rgb), 0.35) 0%, rgba(var(--neon-primary-rgb), 0.1) 45%, transparent 70%)',
            animation: 'nebulaPulse1 12s ease-in-out infinite alternate',
          }}
        />

        {/* Пульсирующая туманность 2 (Вторичный неон) */}
        <div
          className="absolute -bottom-32 -right-24 h-[750px] w-[750px] rounded-full blur-[100px]"
          style={{
            background:
              'radial-gradient(circle, rgba(var(--neon-secondary-rgb), 0.28) 0%, rgba(168, 85, 247, 0.15) 50%, transparent 70%)',
            animation: 'nebulaPulse2 15s ease-in-out infinite alternate',
          }}
        />

        {/* Центральная рассеянная туманность */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[550px] w-[680px] rounded-full blur-[110px]"
          style={{
            background:
              'radial-gradient(circle, rgba(var(--neon-primary-rgb), 0.16) 0%, rgba(var(--neon-secondary-rgb), 0.08) 40%, transparent 65%)',
            animation: 'nebulaPulse1 18s ease-in-out infinite alternate-reverse',
          }}
        />

        {/* Мерцающие звёзды */}
        {STARS.map((star, idx) => (
          <div
            key={idx}
            className="absolute rounded-full bg-white"
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              boxShadow: star.size > 1.8 ? '0 0 6px rgba(255, 255, 255, 0.85)' : undefined,
              animation: `starTwinkle ${star.dur} ease-in-out infinite`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* 3. Dark Hex / Matrix: Тёмный технологичный фон с шестиугольниками и виньеткой */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          background === 'dark-hex' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[#06080d]" />

        {/* Векторный технологичный паттерн шестиугольников */}
        <svg
          className="absolute inset-0 h-full w-full opacity-35"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="gv-hex-grid"
              width="48"
              height="83.14"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0,20.785 L 24,0 L 48,20.785 L 48,62.355 L 24,83.14 L 0,62.355 Z M 24,0 L 24,83.14 M 0,41.57 L 48,41.57"
                fill="none"
                stroke="var(--neon-primary)"
                strokeWidth="0.8"
                strokeOpacity="0.28"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gv-hex-grid)" />
        </svg>

        {/* Мягкое центральное свечение */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full blur-[120px] opacity-15"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(var(--neon-primary-rgb), 0.7) 0%, transparent 65%)',
          }}
        />

        {/* Мягкая затемняющая виньетка по краям */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 32%, rgba(6, 8, 13, 0.75) 70%, rgba(3, 4, 7, 0.98) 100%)',
          }}
        />
      </div>

      {/* 4. Pure Obsidian: Чистый минималистичный тёмный фон со строгим верхним неоновым градиентом */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          background === 'pure-obsidian' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 bg-[#06070a]" />

        {/* Едва заметный верхний неоновый градиент для максимальной строгости */}
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[1000px] rounded-full blur-[130px] opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(var(--neon-primary-rgb), 0.55) 0%, transparent 65%)',
          }}
        />

        {/* Мягкий вертикальный световой спад */}
        <div
          className="absolute top-0 left-0 right-0 h-96 opacity-30"
          style={{
            background:
              'linear-gradient(180deg, rgba(var(--neon-primary-rgb), 0.08) 0%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}
