
import React from 'react';
import Icon from './Icon';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10 p-4 border-b border-gray-700">
      <div className="container mx-auto flex items-center">
        <Icon icon="rocket" className="w-8 h-8 text-indigo-400" />
        <h1 className="text-xl sm:text-2xl font-bold ml-3 text-white">Founders Hub</h1>
      </div>
    </header>
  );
};

export default Header;
