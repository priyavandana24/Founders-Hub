import React from 'react';
import Icon, { IconType } from './Icon';

export type Feature = 'Dashboard' | 'Creative Studio' | 'AI Mentor' | 'Market Research' | 'Content Factory';

interface NavigationProps {
  features: { name: Feature; icon: IconType }[];
  activeFeature: Feature;
  setActiveFeature: (feature: Feature) => void;
}

const Navigation: React.FC<NavigationProps> = ({ features, activeFeature, setActiveFeature }) => {
  return (
    <nav className="bg-gray-800/30 p-4 md:w-64 md:border-r md:border-gray-700">
      <ul className="flex flex-row md:flex-col gap-2">
        {features.map(({ name, icon }) => (
          <li key={name} className="flex-1 md:flex-none">
            <button
              onClick={() => setActiveFeature(name)}
              className={`w-full flex items-center justify-center md:justify-start text-left p-3 rounded-lg transition-colors duration-200 ${
                activeFeature === name
                  ? 'bg-indigo-600 text-white font-semibold shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon icon={icon} className="w-5 h-5" />
              <span className="ml-3 hidden md:inline">{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;
