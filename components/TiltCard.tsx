'use client';

import { useState, useRef, useCallback } from 'react';

interface TiltCardProps {
  coverUrl?: string | null;
  children: React.ReactNode;
  className?: string;
  statusGlowClass?: string;
}

export default function TiltCard({
  coverUrl,
  children,
  className = '',
  statusGlowClass = '',
}: TiltCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glareStyle, setGlareStyle] = useState({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [transformStyle, setTransformStyle] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) * 100;
    const py = (y / rect.height) * 100;

    // Мягкий 3D-наклон до ±7 градусов
    const rotateY = ((x / rect.width) - 0.5) * 14;
    const rotateX = (0.5 - (y / rect.height)) * 14;

    setTransformStyle(
      `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`
    );

    setGlareStyle({
      x: Math.round(px),
      y: Math.round(py),
      opacity: 0.35,
    });
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTransformStyle('perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlareStyle((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div className="relative group/tilt">
      {/* Ambient Glow (фон-хамелеон позади карточки) */}
      {coverUrl ? (
        <div
          className="absolute -inset-2 -z-10 rounded-2xl bg-cover bg-center blur-2xl opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-45 pointer-events-none scale-90 group-hover/tilt:scale-105"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
      ) : (
        <div className="absolute -inset-2 -z-10 rounded-2xl bg-indigo-600/25 blur-2xl opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-40 pointer-events-none scale-90 group-hover/tilt:scale-105" />
      )}

      {/* 3D Контейнер карточки */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: transformStyle,
          transition: isHovered
            ? 'transform 0.08s ease-out'
            : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
          transformStyle: 'preserve-3d',
        }}
        className={`relative overflow-hidden rounded-xl bg-[#10141d] transition-shadow duration-300 ${statusGlowClass} ${className}`}
      >
        {children}

        {/* Радиальный световой блик поверх постера (как на карточках Steam) */}
        <div
          className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 rounded-xl"
          style={{
            opacity: glareStyle.opacity,
            background: `radial-gradient(circle at ${glareStyle.x}% ${glareStyle.y}%, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 70%)`,
            mixBlendMode: 'overlay',
          }}
        />
      </div>
    </div>
  );
}
