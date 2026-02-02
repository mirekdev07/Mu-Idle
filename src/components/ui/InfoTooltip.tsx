'use client';

import { useState } from 'react';

interface InfoTooltipProps {
  content: React.ReactNode;
  color?: 'blue' | 'yellow' | 'green' | 'red' | 'purple';
}

const colorClasses = {
  blue: 'bg-blue-500 text-blue-100 border-blue-400',
  yellow: 'bg-yellow-500 text-yellow-100 border-yellow-400',
  green: 'bg-green-500 text-green-100 border-green-400',
  red: 'bg-red-500 text-red-100 border-red-400',
  purple: 'bg-purple-500 text-purple-100 border-purple-400',
};

export default function InfoTooltip({ content, color = 'blue' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <span
        className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold cursor-help ${colorClasses[color]} opacity-70 hover:opacity-100 transition-opacity`}
      >
        i
      </span>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 pointer-events-none">
          <div className="bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-3 text-xs text-gray-200">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-600" />
          </div>
        </div>
      )}
    </span>
  );
}
