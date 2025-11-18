import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import Navigation, { Feature } from './components/Navigation';
import Dashboard from './features/Dashboard';
import CreativeStudio from './features/CreativeStudio';
import AiMentor from './features/AiMentor';
import MarketResearch from './features/MarketResearch';
import ContentFactory from './features/ContentFactory';
import { IconType } from './components/Icon';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<Feature>('Dashboard');

  const features: { name: Feature; icon: IconType }[] = [
    { name: 'Dashboard', icon: 'dashboard' },
    { name: 'Creative Studio', icon: 'sparkles' },
    { name: 'AI Mentor', icon: 'microphone' },
    { name: 'Market Research', icon: 'search' },
    { name: 'Content Factory', icon: 'document-text' },
  ];

  const renderActiveFeature = () => {
    switch (activeFeature) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Creative Studio':
        return <CreativeStudio />;
      case 'AI Mentor':
        return <AiMentor />;
      case 'Market Research':
        return <MarketResearch />;
      case 'Content Factory':
        return <ContentFactory />;
      default:
        return <Dashboard />;
    }
  };

  const memoizedFeature = useMemo(() => renderActiveFeature(), [activeFeature]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col">
      <Header />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <Navigation
          features={features}
          activeFeature={activeFeature}
          setActiveFeature={setActiveFeature}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {memoizedFeature}
        </main>
      </div>
    </div>
  );
};

export default App;
