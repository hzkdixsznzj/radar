'use client';

import { motion } from 'framer-motion';

const DOTS = [
  { x: 35, y: 25, delay: 0.3 },
  { x: 70, y: 40, delay: 1.2 },
  { x: 20, y: 60, delay: 2.1 },
  { x: 55, y: 70, delay: 0.8 },
  { x: 80, y: 20, delay: 1.8 },
  { x: 45, y: 45, delay: 2.5 },
  { x: 15, y: 35, delay: 0.5 },
  { x: 65, y: 75, delay: 1.5 },
];

export function RadarAnimation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      <div className="relative h-[600px] w-[600px] md:h-[700px] md:w-[700px]">
        {/* Concentric circles */}
        {[1, 2, 3, 4].map((ring) => (
          <div
            key={ring}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-blue/[0.06]"
            style={{
              width: `${ring * 25}%`,
              height: `${ring * 25}%`,
            }}
          />
        ))}

        {/* Rotating sweep beam */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-bottom-left"
          style={{ translateX: '0%', translateY: '-100%' }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <div
            className="h-full w-full origin-bottom-left"
            style={{
              background:
                'conic-gradient(from -10deg at 0% 100%, transparent 0deg, rgba(59,130,246,0.12) 30deg, transparent 60deg)',
            }}
          />
          {/* Beam leading edge */}
          <div
            className="absolute bottom-0 left-0 h-full w-px origin-bottom"
            style={{
              background:
                'linear-gradient(to top, rgba(59,130,246,0.3), transparent)',
            }}
          />
        </motion.div>

        {/* Pulsing dots */}
        {DOTS.map((dot, i) => (
          <motion.div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-accent-blue/40"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.8, 1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              delay: dot.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Center glow */}
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-blue/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />

        {/* Ambient gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,var(--color-bg-primary)_70%)]" />
      </div>
    </div>
  );
}
