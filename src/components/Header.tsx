import React from 'react';

export const Header: React.FC<{ 
  onRefreshState?: () => void;
}> = ({ onRefreshState }) => {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-700/50 bg-stone-950/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-emerald-400">
            RevRecover
          </div>
          <span className="text-xs font-mono text-stone-500 uppercase tracking-wider">AI-Powered Revenue Recovery</span>
        </div>

        {/* Right: GitHub Link */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Raj-Likhit/revrecover"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-900/50 hover:bg-stone-800 border border-stone-700/50 hover:border-stone-600 transition-all text-sm font-medium text-stone-300 hover:text-stone-100"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.544 2.914 1.184.092-.923.35-1.544.636-1.9-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.195 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span>GitHub</span>
          </a>

          {/* Refresh button */}
          {onRefreshState && (
            <button
              onClick={onRefreshState}
              className="p-2 rounded-lg bg-stone-900/50 hover:bg-stone-800 border border-stone-700/50 hover:border-stone-600 transition-all text-stone-400 hover:text-stone-200"
              title="Refresh state"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
