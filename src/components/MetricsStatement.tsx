import React, { useEffect, useState } from 'react';

export const MetricsStatement: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [countRevRecover, setCountRevRecover] = useState(0);
  const [countControl, setCountControl] = useState(0);
  const [countLift, setCountLift] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById('metrics-section');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [isVisible]);

  // Animate counters when visible
  useEffect(() => {
    if (!isVisible) return;

    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing: ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      setCountRevRecover(Math.round(44.4 * easeProgress * 10) / 10);
      setCountControl(Math.round(17.9 * easeProgress * 10) / 10);
      setCountLift(Math.round(26.6 * easeProgress * 10) / 10);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [isVisible]);

  return (
    <section id="metrics-section" className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-900 to-stone-950 overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Main Metrics Display */}
        <div className={`text-center space-y-8 transition-all duration-700 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {/* Large Numbers */}
          <div className="space-y-4">
            {/* RevRecover Rate */}
            <div className={`transform transition-all duration-500 ${isVisible ? 'translate-y-0' : 'translate-y-8'}`}>
              <p className="text-sm uppercase tracking-widest text-stone-500 mb-2">RevRecover Success Rate</p>
              <div className="text-8xl sm:text-9xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-500">
                {countRevRecover.toFixed(1)}%
              </div>
            </div>

            {/* Comparison Operators and Control */}
            <div className={`flex items-center justify-center gap-6 sm:gap-8 transform transition-all duration-500 delay-100 ${isVisible ? 'translate-y-0' : 'translate-y-8'}`}>
              <div className="text-center">
                <p className="text-sm uppercase tracking-widest text-stone-500 mb-4">vs</p>
                <p className="text-7xl sm:text-8xl font-black text-rose-400">{countControl.toFixed(1)}%</p>
                <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Control Group</p>
              </div>

              {/* Equals */}
              <div className={`text-6xl sm:text-7xl font-black text-amber-400 animate-pulse`}>=</div>

              <div className="text-center">
                <p className="text-sm uppercase tracking-widest text-stone-500 mb-4">Proven</p>
                <p className="text-7xl sm:text-8xl font-black text-amber-400">{countLift.toFixed(1)}%</p>
                <p className="text-sm uppercase tracking-widest text-stone-500 mt-2">Real Lift</p>
              </div>
            </div>
          </div>

          {/* Proof Badge */}
          <div className={`border-t border-stone-700/50 pt-8 transform transition-all duration-500 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <p className="text-stone-400 mb-4">Statistical Significance</p>
            <div className="flex flex-wrap justify-center gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">z=2.59</p>
                <p className="text-xs text-stone-500 mt-1">Z-score</p>
              </div>
              <div className="w-px bg-stone-700" />
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">p=0.0096</p>
                <p className="text-xs text-stone-500 mt-1">P-value</p>
              </div>
              <div className="w-px bg-stone-700" />
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">10</p>
                <p className="text-xs text-stone-500 mt-1">Independent runs</p>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className={`bg-gradient-to-r from-amber-950/40 to-transparent border border-amber-500/20 rounded-lg p-6 sm:p-8 transform transition-all duration-500 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <p className="text-amber-300 text-sm sm:text-base">
              <span className="font-bold">This is not marketing.</span> The 26.6% is the net lift after removing all attribution bias. We held back 20% of eligible cases and measured the difference.
            </p>
          </div>

          {/* Breakdown */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-8 transform transition-all duration-500 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="p-6 sm:p-8 rounded-lg border border-stone-700/50 bg-stone-900/40 hover:bg-stone-900/60 transition-colors">
              <p className="text-3xl sm:text-4xl font-bold text-cyan-400">₹226K</p>
              <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mt-3 font-medium">Revenue Recovered</p>
            </div>
            <div className="p-6 sm:p-8 rounded-lg border border-stone-700/50 bg-stone-900/40 hover:bg-stone-900/60 transition-colors">
              <p className="text-3xl sm:text-4xl font-bold text-emerald-400">44.4%</p>
              <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mt-3 font-medium">Conversion Rate</p>
            </div>
            <div className="p-6 sm:p-8 rounded-lg border border-stone-700/50 bg-stone-900/40 hover:bg-stone-900/60 transition-colors">
              <p className="text-3xl sm:text-4xl font-bold text-amber-400">35×</p>
              <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-wider mt-3 font-medium">ROI per Action</p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className={`text-center mt-16 transform transition-all duration-700 delay-700 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-stone-500 text-sm">
            Ready to deploy? We've validated this works before shipping to production.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};
