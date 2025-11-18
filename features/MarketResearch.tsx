
import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getWebSearchResults, getLocalSearchResults } from '../services/geminiService';
import { GroundingChunk } from '../types';
import Icon from '../components/Icon';

type SearchMode = 'web' | 'local';

const MarketResearch: React.FC = () => {
    const [mode, setMode] = useState<SearchMode>('web');
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState('');
    const [sources, setSources] = useState<GroundingChunk[]>([]);

    const handleSearch = async () => {
        if (!query) return;
        setIsLoading(true);
        setError('');
        setResult('');
        setSources([]);

        try {
            let response;
            if (mode === 'web') {
                response = await getWebSearchResults(query);
            } else {
                response = await getLocalSearchResults(query);
            }
            setResult(response.text);
            if (response.sources) {
                setSources(response.sources);
            }
        } catch (err: any) {
            setError('Failed to fetch results. ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderSources = () => {
        if (sources.length === 0) return null;
        return (
            <div className="mt-6 border-t border-gray-700 pt-4">
                <h4 className="text-lg font-semibold text-gray-300 mb-2">Sources:</h4>
                <ul className="list-disc list-inside space-y-1">
                    {sources.map((chunk, index) => {
                        if (chunk.web) {
                            return <li key={index}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{chunk.web.title}</a></li>;
                        }
                        if (chunk.maps) {
                            return <li key={index}><a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{chunk.maps.title}</a></li>;
                        }
                        return null;
                    })}
                </ul>
            </div>
        )
    }

    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-4">Market Research AI</h2>
            <p className="text-gray-400 mb-6">Get up-to-date insights from Google Search and Maps.</p>

            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-lg mb-4">
                    <button onClick={() => setMode('web')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${mode === 'web' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        Web Search
                    </button>
                    <button onClick={() => setMode('local')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${mode === 'local' ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        Local Search
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={mode === 'web' ? "e.g., Latest trends in AI startups" : "e.g., Coffee shops with Wi-Fi near me"}
                        className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                    <button onClick={handleSearch} disabled={isLoading || !query} className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                        <Icon icon="send" className="w-6 h-6" />
                    </button>
                </div>

                <div className="mt-6">
                    {isLoading && <LoadingSpinner text="Searching..." />}
                    {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                    {result && (
                        <div className="prose prose-invert prose-p:text-gray-300 prose-strong:text-white prose-headings:text-indigo-300 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                             <pre className="whitespace-pre-wrap font-sans text-gray-300">{result}</pre>
                            {renderSources()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketResearch;
