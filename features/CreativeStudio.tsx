
import React, { useState, useCallback } from 'react';
// Fix: Import IconType to resolve TypeScript errors.
import Icon, { IconType } from '../components/Icon';
import ImageUploader from '../components/ImageUploader';
import LoadingSpinner from '../components/LoadingSpinner';
import { generateImage, editImage, animateImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';

type CreativeTool = 'generate' | 'edit' | 'animate';

const CreativeStudio: React.FC = () => {
    const [activeTool, setActiveTool] = useState<CreativeTool>('generate');
    const [prompt, setPrompt] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [animatePrompt, setAnimatePrompt] = useState('');
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [animateImageFile, setAnimateImageFile] = useState<File | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [originalEditImage, setOriginalEditImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [videoLoadingMessage, setVideoLoadingMessage] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    
    const [apiKeySelected, setApiKeySelected] = useState(true);

    const handleApiKeyCheck = async () => {
        if(typeof window.aistudio === 'undefined') {
            setError("Veo is not available in this environment.");
            return false;
        }
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
        return hasKey;
    };

    const handleSelectApiKey = async () => {
        if(typeof window.aistudio === 'undefined') {
             setError("Veo is not available in this environment.");
             return;
        }
        await window.aistudio.openSelectKey();
        setApiKeySelected(true); // Assume success to avoid race condition
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError('');
        setGeneratedImage(null);
        try {
            const result = await generateImage(prompt);
            setGeneratedImage(result);
        } catch (e: any) {
            setError('Failed to generate image. Please try again. ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editPrompt || !imageFile) return;
        setIsLoading(true);
        setError('');
        setEditedImage(null);
        try {
            const base64Image = await fileToBase64(imageFile);
            setOriginalEditImage(base64Image);
            const result = await editImage(base64Image, imageFile.type, editPrompt);
            setEditedImage(result);
        } catch (e: any) {
            setError('Failed to edit image. Please try again. ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnimate = async () => {
        if (!animateImageFile) return;
        const hasKey = await handleApiKeyCheck();
        if (!hasKey) return;

        setIsLoading(true);
        setError('');
        setGeneratedVideo(null);
        const loadingMessages = [
            "Warming up the animation engine...",
            "Adding cinematic magic...",
            "Rendering frames...",
            "This can take a few minutes...",
            "Almost there, finalizing your video..."
        ];
        let messageIndex = 0;
        setVideoLoadingMessage(loadingMessages[messageIndex]);
        const intervalId = setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setVideoLoadingMessage(loadingMessages[messageIndex]);
        }, 5000);
        
        try {
            const base64Image = await fileToBase64(animateImageFile);
            const videoUrl = await animateImage(base64Image, animateImageFile.type, animatePrompt, aspectRatio);
            setGeneratedVideo(videoUrl);
        } catch (e: any) {
            if (e.message.includes('Requested entity was not found')) {
                setApiKeySelected(false);
                setError('API Key not found. Please select your API key and try again.');
            } else {
                setError('Failed to animate image. Please try again. ' + e.message);
            }
        } finally {
            setIsLoading(false);
            clearInterval(intervalId);
            setVideoLoadingMessage('');
        }
    };

    const renderTool = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-64">
                <LoadingSpinner text={videoLoadingMessage || 'Creating...'} />
            </div>;
        }

        switch (activeTool) {
            case 'generate':
                return (
                    <div className="space-y-4">
                        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="A futuristic cityscape with flying cars, photorealistic..." className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={3}/>
                        <button onClick={handleGenerate} disabled={!prompt} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500">Generate Image</button>
                        {generatedImage && <img src={generatedImage} alt="Generated" className="mt-4 rounded-lg shadow-lg w-full max-w-lg mx-auto" />}
                    </div>
                );
            case 'edit':
                return (
                    <div className="space-y-4">
                        <ImageUploader onImageSelect={setImageFile} title="Upload Image to Edit" />
                        <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="Add a retro filter" className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2}/>
                        <button onClick={handleEdit} disabled={!editPrompt || !imageFile} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500">Edit Image</button>
                        <div className="flex gap-4 mt-4 flex-wrap justify-center">
                            {originalEditImage && <div className="flex-1 min-w-[200px]"><h4 className="text-center mb-2">Original</h4><img src={originalEditImage} alt="Original" className="rounded-lg shadow-lg w-full" /></div>}
                            {editedImage && <div className="flex-1 min-w-[200px]"><h4 className="text-center mb-2">Edited</h4><img src={editedImage} alt="Edited" className="rounded-lg shadow-lg w-full" /></div>}
                        </div>
                    </div>
                );
            case 'animate':
                 if (!apiKeySelected) {
                    return (
                        <div className="text-center bg-yellow-900/50 border border-yellow-700 p-6 rounded-lg">
                            <h3 className="text-lg font-semibold text-yellow-300">API Key Required</h3>
                            <p className="my-2 text-yellow-200">Veo video generation requires you to select your own API key and enable billing.</p>
                            <p className="text-sm text-yellow-400 mb-4">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">billing documentation</a>.</p>
                            <button onClick={handleSelectApiKey} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700">Select API Key</button>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4">
                        <ImageUploader onImageSelect={setAnimateImageFile} title="Upload Image to Animate" />
                        <textarea value={animatePrompt} onChange={(e) => setAnimatePrompt(e.target.value)} placeholder="Optional: Describe the animation (e.g., make the clouds move slowly)" className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500" rows={2}/>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-300">Aspect Ratio:</span>
                            <div className="flex gap-2">
                                <button onClick={() => setAspectRatio('16:9')} className={`px-4 py-1 rounded-md ${aspectRatio === '16:9' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>16:9</button>
                                <button onClick={() => setAspectRatio('9:16')} className={`px-4 py-1 rounded-md ${aspectRatio === '9:16' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>9:16</button>
                            </div>
                        </div>
                        <button onClick={handleAnimate} disabled={!animateImageFile} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-gray-500">Animate Image</button>
                        {generatedVideo && <video src={generatedVideo} controls autoPlay loop className="mt-4 rounded-lg shadow-lg w-full max-w-lg mx-auto" />}
                    </div>
                );
        }
    };
    
    const tools = [
        { id: 'generate', name: 'Generate', icon: 'image' as IconType },
        { id: 'edit', name: 'Edit', icon: 'edit' as IconType },
        { id: 'animate', name: 'Animate', icon: 'video' as IconType }
    ];

    return (
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-4">Creative Studio</h2>
            <div className="mb-6 flex space-x-2 bg-gray-800/50 p-1 rounded-lg">
                {tools.map(tool => (
                    <button key={tool.id} onClick={() => setActiveTool(tool.id as CreativeTool)} 
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors text-sm font-medium ${activeTool === tool.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                        <Icon icon={tool.icon} className="w-5 h-5" />
                        {tool.name}
                    </button>
                ))}
            </div>
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                {error && <p className="text-red-400 mb-4 bg-red-900/50 p-3 rounded-lg">{error}</p>}
                {renderTool()}
            </div>
        </div>
    );
};

export default CreativeStudio;
