import React, { useEffect, useState } from 'react';

interface Scenario {
  id: string;
  name: string;
  label: string;
  color: string;
  description: string;
  glowColor: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'soft_decline',
    name: 'Soft Decline',
    label: 'System WAITS',
    color: '#06B6D4',
    description: 'Card declined, but likely temporary. Wait for card update.',
    glowColor: 'cyan',
  },
  {
    id: 'hard_decline',
    name: 'Hard Decline',
    label: 'System ACTS',
    color: '#F43F5E',
    description: 'Card lost/stolen. Send immediate card update.',
    glowColor: 'rose',
  },
  {
    id: 'afa_required',
    name: 'AFA Required',
    label: 'System SENDS OTP',
    color: '#A855F7',
    description: 'Customer needs to authenticate. Send OTP flow.',
    glowColor: 'purple',
  },
  {
    id: 'halted',
    name: 'Halted',
    label: 'System EMPATHIZES',
    color: '#F59E0B',
    description: 'Multiple declines. Customer likely stressed. Wait.',
    glowColor: 'amber',
  },
  {
    id: 'unknown',
    name: 'Unknown Decline',
    label: 'System ESCALATES',
    color: '#6B7280',
    description: 'Unusual decline reason. Route to human review.',
    glowColor: 'gray',
  },
];

interface ScenarioGridProps {
  onScenarioClick: (scenarioId: string) => Promise<void>;
  isLoading?: boolean;
}

export const ScenarioGrid: React.FC<ScenarioGridProps> = ({ onScenarioClick, isLoading = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById('scenario-grid-section');
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleScenarioClick = async (scenarioId: string) => {
    setActiveScenario(scenarioId);
    setLoadingScenario(scenarioId);
    try {
      await onScenarioClick(scenarioId);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <section id="scenario-grid-section" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-stone-950 to-stone-900 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-stone-100 mb-4">
            Five Failure Scenarios
          </h2>
          <p className="text-lg text-stone-400">
            Click any scenario to see how RevRecover decides to act
          </p>
        </div>

        {/* Hexagon Grid - Proper spacing for 5 hexagons */}
        <div className="flex justify-center items-center mb-12">
          <div className="max-w-6xl w-full px-4">
            {/* Row 1: Center hexagon */}
            <div className="flex justify-center mb-8 lg:mb-16">
              <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <HexagonCard
                  scenario={SCENARIOS[0]}
                  isVisible={isVisible}
                  isActive={activeScenario === SCENARIOS[0].id}
                  isLoading={loadingScenario === SCENARIOS[0].id}
                  onClick={() => handleScenarioClick(SCENARIOS[0].id)}
                  delay={0}
                />
              </div>
            </div>

            {/* Row 2: Two hexagons side by side */}
            <div className="flex justify-center gap-6 sm:gap-12 lg:gap-20 mb-8 lg:mb-12 flex-wrap">
              <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <HexagonCard
                  scenario={SCENARIOS[1]}
                  isVisible={isVisible}
                  isActive={activeScenario === SCENARIOS[1].id}
                  isLoading={loadingScenario === SCENARIOS[1].id}
                  onClick={() => handleScenarioClick(SCENARIOS[1].id)}
                  delay={100}
                />
              </div>
              <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <HexagonCard
                  scenario={SCENARIOS[2]}
                  isVisible={isVisible}
                  isActive={activeScenario === SCENARIOS[2].id}
                  isLoading={loadingScenario === SCENARIOS[2].id}
                  onClick={() => handleScenarioClick(SCENARIOS[2].id)}
                  delay={150}
                />
              </div>
            </div>

            {/* Row 3: Two hexagons side by side */}
            <div className="flex justify-center gap-6 sm:gap-12 lg:gap-20 mb-8 lg:mb-12 flex-wrap">
              <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <HexagonCard
                  scenario={SCENARIOS[3]}
                  isVisible={isVisible}
                  isActive={activeScenario === SCENARIOS[3].id}
                  isLoading={loadingScenario === SCENARIOS[3].id}
                  onClick={() => handleScenarioClick(SCENARIOS[3].id)}
                  delay={200}
                />
              </div>
              <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44">
                <HexagonCard
                  scenario={SCENARIOS[4]}
                  isVisible={isVisible}
                  isActive={activeScenario === SCENARIOS[4].id}
                  isLoading={loadingScenario === SCENARIOS[4].id}
                  onClick={() => handleScenarioClick(SCENARIOS[4].id)}
                  delay={250}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-20 pt-12 border-t border-stone-700/50">
          <p className="text-center text-stone-400 text-sm mb-8">Five core decision patterns</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8">
            {SCENARIOS.map((scenario) => (
              <div key={scenario.id} className="text-center group">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-3 mx-auto transition-all duration-300 group-hover:scale-125"
                  style={{
                    background: `linear-gradient(135deg, ${scenario.color}40, ${scenario.color}20)`,
                    border: `2px solid ${scenario.color}60`,
                  }}
                />
                <p className="font-bold text-stone-300 text-sm">{scenario.name}</p>
                <p className={`text-xs mt-2 transition-colors duration-300`} style={{ color: scenario.color }}>
                  {scenario.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

interface HexagonCardProps {
  scenario: Scenario;
  isVisible: boolean;
  isActive: boolean;
  isLoading: boolean;
  onClick: () => void;
  delay: number;
}

const HexagonCard: React.FC<HexagonCardProps> = ({ scenario, isVisible, isActive, isLoading, onClick, delay }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative transform transition-all duration-500 cursor-pointer ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
      }`}
      style={{ transitionDelay: `${isVisible ? delay : 0}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Hexagon Background */}
      <div
        className={`relative w-40 h-40 sm:w-44 sm:h-44 transform transition-all duration-300 ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${isActive ? 'scale-110' : ''}`}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: `linear-gradient(135deg, ${scenario.color}20, ${scenario.color}05)`,
          border: `2px solid ${scenario.color}40`,
          transition: 'all 300ms ease-out',
          ...(isHovered && {
            background: `linear-gradient(135deg, ${scenario.color}40, ${scenario.color}20)`,
            border: `2px solid ${scenario.color}80`,
            boxShadow: `0 0 30px ${scenario.color}40, inset 0 0 30px ${scenario.color}20`,
          }),
          ...(isActive && {
            background: `linear-gradient(135deg, ${scenario.color}60, ${scenario.color}40)`,
            border: `2px solid ${scenario.color}`,
            boxShadow: `0 0 50px ${scenario.color}60, inset 0 0 40px ${scenario.color}40`,
          }),
        }}
      >
        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          {/* Loading spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-3 border-transparent border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Description on hover */}
          {isHovered && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-xs sm:text-sm font-medium text-stone-100 leading-tight">{scenario.description}</p>
            </div>
          )}

          {/* Label normally */}
          {!isHovered && !isLoading && (
            <>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mb-3" style={{
                background: `linear-gradient(135deg, ${scenario.color}40, ${scenario.color}20)`,
                border: `2px solid ${scenario.color}60`,
              }} />
              <p className="text-sm sm:text-base font-bold text-stone-100 text-center leading-tight">{scenario.name}</p>
              <p className="text-xs text-stone-400 mt-2 text-center">{scenario.label}</p>
            </>
          )}
        </div>
      </div>

      {/* Particles on click */}
      {isActive && <ParticleEffect color={scenario.color} />}

      <style>{`
        @keyframes particleFloat {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) scale(0);
          }
        }
      `}</style>
    </div>
  );
};

const ParticleEffect: React.FC<{ color: string }> = ({ color }) => {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i / 8) * Math.PI * 2,
    distance: 60 + Math.random() * 40,
  }));

  return (
    <>
      {particles.map((particle) => {
        const tx = Math.cos(particle.angle) * particle.distance;
        const ty = Math.sin(particle.angle) * particle.distance;

        return (
          <div
            key={particle.id}
            className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              background: color,
              animation: `particleFloat 0.8s ease-out forwards`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </>
  );
};
