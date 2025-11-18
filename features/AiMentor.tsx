import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audioUtils';
import Icon from '../components/Icon';

// A local `LiveSession` interface is defined for type safety because it's not exported from the SDK.
// The session object has more methods, but only `close()` is called on the ref, so this is sufficient for type-checking.
interface LiveSession {
    close: () => void;
}

type MentorPersonality = 'friendly' | 'direct' | 'enthusiastic' | 'analytical';

const personalityOptions: { id: MentorPersonality; name: string; instruction: string }[] = [
    { id: 'friendly', name: 'Friendly & Encouraging', instruction: 'You are a friendly and encouraging mentor for startup founders. Keep your responses concise and helpful.' },
    { id: 'direct', name: 'Direct & Concise', instruction: 'You are a direct and concise mentor for startup founders. Get straight to the point and provide actionable advice. Avoid fluff.' },
    { id: 'enthusiastic', name: 'Enthusiastic & Motivating', instruction: 'You are an enthusiastic and motivating mentor for startup founders. Your goal is to inspire and energize. Use positive and uplifting language.' },
    { id: 'analytical', name: 'Analytical & Detailed', instruction: 'You are an analytical and detailed mentor for startup founders. Provide in-depth, data-driven advice. Break down complex topics into smaller parts.' }
];

const MENTOR_HISTORY_KEY = 'ai-mentor-conversation-history';

const AiMentor: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [status, setStatus] = useState('Idle. Press Start to connect.');
    const [transcription, setTranscription] = useState<{ speaker: 'user' | 'model'; text: string }[]>([]);
    const [mentorPersonality, setMentorPersonality] = useState<MentorPersonality>('analytical');
    
    // New state for real-time transcription display
    const [currentUserText, setCurrentUserText] = useState('');
    const [currentModelText, setCurrentModelText] = useState('');

    const sessionRef = useRef<LiveSession | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const transcriptionContainerRef = useRef<HTMLDivElement>(null);

    const currentUserTranscriptionRef = useRef('');
    const currentModelTranscriptionRef = useRef('');
    
    let nextStartTime = 0;
    const sources = new Set<AudioBufferSourceNode>();

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(MENTOR_HISTORY_KEY);
            if(savedHistory) {
                setTranscription(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load mentor history:", e);
            setTranscription([]);
        }
    }, []);

    // Save history to localStorage on change
    useEffect(() => {
        try {
            if (transcription.length > 0) {
                localStorage.setItem(MENTOR_HISTORY_KEY, JSON.stringify(transcription));
            } else {
                localStorage.removeItem(MENTOR_HISTORY_KEY);
            }
        } catch (error) {
            console.error("Failed to save mentor history:", error);
        }
    }, [transcription]);
    
    // Auto-scroll to bottom of transcription
    useEffect(() => {
        if (transcriptionContainerRef.current) {
            transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight;
        }
    }, [transcription, currentUserText, currentModelText]);

    const handleClearHistory = useCallback(() => {
        if(isSessionActive) return;
        setTranscription([]);
    }, [isSessionActive]);
    
    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
         if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
        }
        audioContextRef.current = null;
        outputAudioContextRef.current = null;

        setIsSessionActive(false);
        setStatus('Session ended. Press Start to connect again.');
        currentUserTranscriptionRef.current = '';
        currentModelTranscriptionRef.current = '';
        setCurrentUserText('');
        setCurrentModelText('');
    }, []);

    const startSession = async () => {
        if (isSessionActive) return;
        setStatus('Connecting...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const selectedPersonality = personalityOptions.find(p => p.id === mentorPersonality);
            const systemInstruction = selectedPersonality?.instruction || personalityOptions[0].instruction;
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
                    systemInstruction: systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        setStatus('Connected and listening...');
                        setIsSessionActive(true);

                        const source = audioContextRef.current!.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;

                        const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        processorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenaiBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                         if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentUserTranscriptionRef.current += text;
                            setCurrentUserText(currentUserTranscriptionRef.current);
                         }
                         if (message.serverContent?.outputTranscription) {
                             const text = message.serverContent.outputTranscription.text;
                             currentModelTranscriptionRef.current += text;
                             setCurrentModelText(currentModelTranscriptionRef.current);
                         }

                         if (message.serverContent?.turnComplete) {
                            const fullInput = currentUserTranscriptionRef.current.trim();
                            const fullOutput = currentModelTranscriptionRef.current.trim();
                            
                            setTranscription(prev => {
                                const newTranscription = [...prev];
                                if(fullInput) newTranscription.push({ speaker: 'user', text: fullInput });
                                if(fullOutput) newTranscription.push({ speaker: 'model', text: fullOutput });
                                return newTranscription;
                            });

                            currentUserTranscriptionRef.current = '';
                            currentModelTranscriptionRef.current = '';
                            setCurrentUserText('');
                            setCurrentModelText('');
                         }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && outputAudioContextRef.current) {
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                            const sourceNode = outputAudioContextRef.current.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputAudioContextRef.current.destination);
                            sourceNode.addEventListener('ended', () => sources.delete(sourceNode));
                            sourceNode.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            sources.add(sourceNode);
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sources.values()) {
                                source.stop();
                                sources.delete(source);
                            }
                            nextStartTime = 0;
                        }
                    },
                    onclose: () => {
                        stopSession();
                    },
                    onerror: (e) => {
                        console.error('Session error:', e);
                        setStatus(`Error: ${e.type}. Please try again.`);
                        stopSession();
                    },
                },
            });

            sessionPromise.then(session => sessionRef.current = session);

        } catch (error) {
            console.error('Failed to start session:', error);
            setStatus('Error: Could not access microphone.');
        }
    };
    
    useEffect(() => {
        return () => stopSession();
    }, [stopSession]);

    return (
        <div className="animate-fade-in flex flex-col h-full">
            <h2 className="text-3xl font-bold text-white mb-4">AI Mentor</h2>
            <p className="text-gray-400 mb-6">Practice your pitch or get advice in a real-time conversation.</p>

            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg flex-1 flex flex-col">
                <div className="mb-4">
                    <label htmlFor="mentor-personality" className="block text-sm font-medium text-gray-300 mb-2">Mentor Personality</label>
                    <select
                        id="mentor-personality"
                        value={mentorPersonality}
                        onChange={(e) => setMentorPersonality(e.target.value as MentorPersonality)}
                        disabled={isSessionActive}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {personalityOptions.map(option => (
                            <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                    </select>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-mono text-indigo-300">{status}</p>
                    <div className="flex items-center space-x-4">
                         <button
                            onClick={handleClearHistory}
                            disabled={isSessionActive}
                            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Clear History
                        </button>
                        <button
                            onClick={startSession}
                            disabled={isSessionActive}
                            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Start
                        </button>
                        <button
                            onClick={stopSession}
                            disabled={!isSessionActive}
                            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Stop
                        </button>
                    </div>
                </div>

                {isSessionActive && (
                    <div className="flex items-center space-x-2 text-green-400 my-4">
                         <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span>Listening...</span>
                    </div>
                )}
                
                <div ref={transcriptionContainerRef} className="bg-gray-900/70 p-4 rounded-lg flex-1 overflow-y-auto space-y-4">
                    {transcription.length === 0 && !currentUserText && !currentModelText && <p className="text-gray-500 text-center">Conversation will appear here...</p>}
                    {transcription.map((entry, index) => (
                        <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                            {entry.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><Icon icon="microphone" className="w-5 h-5"/></div>}
                            <div className={`p-3 rounded-lg max-w-lg ${entry.speaker === 'user' ? 'bg-indigo-900/70 text-gray-200' : 'bg-gray-700/50 text-gray-300'}`}>
                                <p>{entry.text}</p>
                            </div>
                            {entry.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold">U</span></div>}
                        </div>
                    ))}
                    {currentUserText && (
                        <div className="flex items-start gap-3 justify-end">
                            <div className="p-3 rounded-lg max-w-lg bg-indigo-900/50 text-gray-400">
                                <p>{currentUserText}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><span className="text-sm font-bold">U</span></div>
                        </div>
                    )}
                    {currentModelText && (
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><Icon icon="microphone" className="w-5 h-5"/></div>
                            <div className="p-3 rounded-lg max-w-lg bg-gray-700/40 text-gray-400">
                                <p>{currentModelText}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiMentor;
