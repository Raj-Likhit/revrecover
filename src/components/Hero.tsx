import React, { useEffect, useState } from 'react';

export const Hero: React.FC<{ onCtaClick: () => void }> = ({ onCtaClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [particlePositions, setParticlePositions] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    setIsVisible(true);
    // Generate particles for animation
    const particles = Array.from({ length: 15 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticlePositions(particles);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 px-4 sm:px-6 lg:px-8">
      {/* Animated background gradient overlay */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animation: 'pulse 8s cubic-bezier(0.4, 0, 0.6, 1) infinite 2s' }} />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particlePositions.map((particle, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400 rounded-full opacity-60"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `float ${4 + i % 3}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-4xl w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        {/* Left: Text Content */}
        <div className="flex-1 text-center lg:text-left">
          <div className={`space-y-6 transform transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-100">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-stone-100 to-emerald-400">
                Smart Triage
              </span>
              <br />
              <span className="text-stone-100">Beats Spam</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-stone-400 leading-relaxed max-w-lg">
              26.6% proven lift. 20% control group. Zero false attribution.
            </p>

            {/* Key Stats Preview */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-bold text-emerald-400">44.4%</span>
                <span className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider">RevRecover Success</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-bold text-rose-400">17.9%</span>
                <span className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider">Control Group</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-bold text-amber-400">=26.6%</span>
                <span className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider">Real Lift</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-8">
              <button
                onClick={onCtaClick}
                className="group relative px-8 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold rounded-lg transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/50 hover:-translate-y-1 active:translate-y-0 flex items-center gap-2 mx-auto lg:mx-0 text-base sm:text-lg"
              >
                <span>See 5 Failure Types</span>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Animated Visual */}
        <div className="flex-1 relative w-full max-w-sm lg:max-w-none">
          <div className={`transform transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {/* SVG Visualization - Money Flow */}
            <svg viewBox="0 0 400 400" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
              {/* Background Circle */}
              <circle cx="200" cy="200" r="180" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.3" />

              {/* Soft Decline Path (Blue/Cyan) */}
              <g id="soft-decline">
                <path
                  d="M 200 50 Q 300 150 250 300"
                  stroke="#06B6D4"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.4"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                  style={{ animation: 'drawPath 3s ease-in-out infinite' }}
                />
                <circle cx="200" cy="50" r="8" fill="#06B6D4" opacity="0.8" />
                <text x="200" y="30" fontSize="14" fill="#06B6D4" textAnchor="middle" fontWeight="bold">
                  WAIT
                </text>
              </g>

              {/* Hard Decline Path (Red/Rose) */}
              <g id="hard-decline">
                <path
                  d="M 200 50 Q 100 150 150 300"
                  stroke="#F43F5E"
                  strokeWidth="3"
                  fill="none"
                  opacity="0.4"
                  strokeDasharray="300"
                  strokeDashoffset="300"
                  style={{ animation: 'drawPath 3s ease-in-out infinite 0.5s' }}
                />
                <circle cx="200" cy="50" r="8" fill="#F43F5E" opacity="0.8" style={{ animation: 'pulse 2s infinite 0.5s' }} />
                <text x="200" y="30" fontSize="14" fill="#F43F5E" textAnchor="middle" fontWeight="bold">
                  ACT
                </text>
              </g>

              {/* Arrows to Decision */}
              <circle cx="200" cy="200" r="30" fill="#A78BFA" fillOpacity="0.15" stroke="#A78BFA" strokeWidth="2" />
              <text x="200" y="208" fontSize="18" fill="#A78BFA" textAnchor="middle" fontWeight="bold">
                AI
              </text>

              {/* Result nodes */}
              <circle cx="250" cy="300" r="12" fill="#10B981" fillOpacity="0.3" stroke="#10B981" strokeWidth="2" />
              <text x="250" y="320" fontSize="12" fill="#10B981" textAnchor="middle">
                Recovery
              </text>

              <circle cx="150" cy="300" r="12" fill="#F59E0B" fillOpacity="0.3" stroke="#F59E0B" strokeWidth="2" />
              <text x="150" y="320" fontSize="12" fill="#F59E0B" textAnchor="middle">
                Action
              </text>
            </svg>
          </div>

          {/* Decorative glow rings */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-pulse" style={{ animation: 'pulse 3s ease-in-out infinite' }} />
            <div className="absolute inset-4 rounded-full border border-amber-500/20 animate-pulse" style={{ animation: 'pulse 3s ease-in-out infinite 0.5s' }} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-stone-500 uppercase tracking-wider font-mono">Scroll to explore</span>
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
          50% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
        }
        @keyframes drawPath {
          0% { stroke-dashoffset: 300; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>
    </section>
  );
};
