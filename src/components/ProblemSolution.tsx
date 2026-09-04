import React, { useEffect, useState } from 'react';

export const ProblemSolution: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById('problem-solution-section');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const items = [
    { icon: '❌', text: 'Message everyone', type: 'problem' },
    { icon: '❌', text: 'False attribution', type: 'problem' },
    { icon: '❌', text: 'No control group', type: 'problem' },
    { icon: '❌', text: 'No prioritization', type: 'problem' },
  ];

  const solutions = [
    { icon: '✓', text: 'Smart triage (6 types)', type: 'solution' },
    { icon: '✓', text: 'Strategic restraint', type: 'solution' },
    { icon: '✓', text: '20% holdout proves lift', type: 'solution' },
    { icon: '✓', text: 'ROI per action', type: 'solution' },
  ];

  return (
    <section id="problem-solution-section" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-stone-950 overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/3 left-0 w-72 h-72 bg-rose-500 rounded-full mix-blend-multiply filter blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-stone-100 mb-4">
            Why Traditional Dunning Fails
          </h2>
          <p className="text-lg text-stone-400">
            The problem isn't reach. It's knowing when to act, and when to wait.
          </p>
        </div>

        {/* Split Comparison */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Traditional Problem */}
          <div
            className={`transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          >
            <div className="h-full p-8 sm:p-10 rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 to-stone-900/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-lg bg-rose-500/20 border border-rose-500/50 flex items-center justify-center">
                  <span className="text-2xl">🚨</span>
                </div>
                <h3 className="text-2xl font-bold text-rose-400">Traditional System</h3>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 transform transition-all duration-500 ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: `${isVisible ? idx * 100 : 0}ms` }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mt-1">
                      <span className="text-lg font-bold text-rose-400">{item.icon}</span>
                    </div>
                    <span className="text-stone-300 text-base leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-rose-500/20">
                <p className="text-sm text-stone-500 italic">
                  "We can't prove this actually works. Could be attribution bias."
                </p>
              </div>
            </div>
          </div>

          {/* Right: RevRecover Solution */}
          <div
            className={`transform transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
          >
            <div className="h-full p-8 sm:p-10 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-stone-900/40 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="text-2xl font-bold text-emerald-400">RevRecover</h3>
              </div>

              <div className="space-y-4">
                {solutions.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-4 transform transition-all duration-500 ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                    }`}
                    style={{ transitionDelay: `${isVisible ? idx * 100 + 200 : 0}ms` }}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mt-1">
                      <span className="text-lg font-bold text-emerald-400">{item.icon}</span>
                    </div>
                    <span className="text-stone-300 text-base leading-relaxed">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-emerald-500/20">
                <p className="text-sm text-stone-400">
                  <span className="font-bold text-emerald-400">Proven:</span> z=2.59 · p=0.0096
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Counter narrative */}
        <div className={`mt-16 p-8 rounded-lg bg-gradient-to-r from-amber-950/30 to-transparent border border-amber-500/20 transform transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-amber-300 text-center font-medium">
            "If traditional dunning actually worked this well, we wouldn't need RevRecover."
          </p>
        </div>
      </div>
    </section>
  );
};
