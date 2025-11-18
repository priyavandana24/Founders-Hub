import React, { useState } from 'react';
import Icon, { IconType } from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateContentPiece } from '../services/geminiService';

type ContentType = 'blog' | 'social' | 'ad';

const ContentFactory: React.FC = () => {
    const [contentType, setContentType] = useState<ContentType>('blog');
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedContent, setGeneratedContent] = useState('');
    const [copySuccess, setCopySuccess] = useState('');

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError('');
        setGeneratedContent('');
        setCopySuccess('');
        try {
            const result = await generateContentPiece(contentType, prompt);
            setGeneratedContent(result);
        } catch (e: any) {
            setError('Failed to generate content. Please try again. ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if(!generatedContent) return;
        navigator.clipboard.writeText(generatedContent);
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
    };

    const contentTypes: { id: ContentType; name: string; icon: IconType, placeholder: string }[] = [
        { id: 'blog', name: 'Blog Post', icon: 'document-text', placeholder: 'e.g., The future of AI in venture capital' },
        { id: 'social', name: 'Social Media Post', icon: 'sparkles', placeholder: 'e.g., Announcing our new seed round' },
        { id: 'ad', name: 'Ad Copy', icon: 'rocket', placeholder: 'e.g., A new SaaS for carbon tracking' }
    ];

    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-2">Content Factory</h2>
            <p className="text-gray-400 mb-6">Generate high-quality marketing content in seconds.</p>

            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <div className="mb-6 flex space-x-2 bg-gray-900/50 p-1 rounded-lg">
                    {contentTypes.map(tool => (
                        <button key={tool.id} onClick={() => setContentType(tool.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${contentType === tool.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                            <Icon icon={tool.icon} className="w-5 h-5" />
                            {tool.name}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={contentTypes.find(c => c.id === contentType)?.placeholder}
                        className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        rows={4}
                    />
                    <button onClick={handleGenerate} disabled={isLoading || !prompt} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                        {isLoading ? 'Generating...' : 'Generate Content'}
                    </button>
                </div>

                {error && <p className="text-red-400 mt-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                
                {isLoading && <div className="mt-6"><LoadingSpinner text="Writing..." /></div>}

                {generatedContent && (
                    <div className="mt-6">
                         <div className="flex justify-between items-center mb-2">
                             <h4 className="text-lg font-semibold text-gray-300">Generated Content:</h4>
                             <button onClick={copyToClipboard} className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg w-20">
                                {copySuccess || 'Copy'}
                             </button>
                         </div>
                        <div className="prose prose-invert prose-p:text-gray-300 prose-strong:text-white prose-headings:text-indigo-300 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                            <pre className="whitespace-pre-wrap font-sans">{generatedContent}</pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentFactory;
