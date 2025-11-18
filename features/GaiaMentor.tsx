import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import Icon from '../components/Icon';
import LoadingSpinner from '../components/LoadingSpinner';

interface Message {
    role: 'user' | 'model';
    parts: { text: string }[];
}

const GAIA_HISTORY_KEY = 'gaia-conversation-history';
const GAIA_INITIAL_MESSAGE: Message = {
    role: 'model',
    parts: [{ text: "Hello! I am Gaia, your strategic AI mentor. How can I help you with your startup today? Feel free to ask about business strategy, brainstorming, or any challenges you're facing." }]
};

const GaiaMentor: React.FC = () => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize Chat and load history
    useEffect(() => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let initialHistory: Message[] = [];
        
        try {
            const savedHistory = localStorage.getItem(GAIA_HISTORY_KEY);
            if (savedHistory) {
                initialHistory = JSON.parse(savedHistory);
                setMessages(initialHistory);
            } else {
                 setMessages([GAIA_INITIAL_MESSAGE]);
            }
        } catch (error) {
            console.error("Failed to load conversation history:", error);
            setMessages([GAIA_INITIAL_MESSAGE]);
        }
        
        const chatInstance = ai.chats.create({
            model: 'gemini-2.5-pro',
            history: initialHistory.length > 0 ? initialHistory : undefined,
            config: {
                systemInstruction: "You are Gaia, a wise and experienced mentor for startup founders. Your goal is to provide strategic advice, help brainstorm ideas, and offer guidance on business challenges. Your tone is insightful, calm, and supportive. You do not have access to real-time information from the web. If a user asks for recent news, trends, or specific data, advise them to use the Market Research tool for up-to-date information.",
            },
        });
        setChat(chatInstance);

    }, []);

    // Save history to localStorage
    useEffect(() => {
        if (messages.length > 1 || (messages.length === 1 && JSON.stringify(messages[0]) !== JSON.stringify(GAIA_INITIAL_MESSAGE))) {
            try {
                localStorage.setItem(GAIA_HISTORY_KEY, JSON.stringify(messages));
            } catch (error) {
                console.error("Failed to save conversation history:", error);
            }
        }
    }, [messages]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSendMessage = useCallback(async () => {
        if (!userInput.trim() || !chat || isLoading) return;

        const userMessage: Message = { role: 'user', parts: [{ text: userInput }] };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        const currentInput = userInput;
        setUserInput('');
        setIsLoading(true);

        try {
            const responseStream = await chat.sendMessageStream({ message: currentInput });

            let modelResponse = '';
            setMessages(prevMessages => [...prevMessages, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of responseStream) {
                modelResponse += chunk.text;
                setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    newMessages[newMessages.length - 1].parts[0].text = modelResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages(prevMessages => {
                 const newMessages = [...prevMessages];
                 if(newMessages[newMessages.length - 1].role === 'model' && newMessages[newMessages.length - 1].parts[0].text === ''){
                     newMessages.pop(); // Remove the empty model message placeholder
                 }
                 newMessages.push({ role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] });
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    }, [userInput, chat, isLoading]);
    
    const handleClearHistory = () => {
        localStorage.removeItem(GAIA_HISTORY_KEY);
        setMessages([GAIA_INITIAL_MESSAGE]);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chatInstance = ai.chats.create({
            model: 'gemini-2.5-pro',
            config: {
                systemInstruction: "You are Gaia, a wise and experienced mentor for startup founders. Your goal is to provide strategic advice, help brainstorm ideas, and offer guidance on business challenges. Your tone is insightful, calm, and supportive. You do not have access to real-time information from the web. If a user asks for recent news, trends, or specific data, advise them to use the Market Research tool for up-to-date information.",
            },
        });
        setChat(chatInstance);
    };

    return (
        <div className="animate-fade-in flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Gaia Mentor</h2>
                    <p className="text-gray-400">Your strategic text-based AI partner for brainstorming, strategy, and advice.</p>
                </div>
                <button 
                    onClick={handleClearHistory}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors flex-shrink-0"
                >
                    Clear History
                </button>
            </div>

            <div className="bg-gray-800/50 rounded-xl shadow-lg flex-1 flex flex-col overflow-hidden">
                <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0"><Icon icon="sparkles" className="w-5 h-5"/></div>}
                            <div className={`p-3 rounded-lg max-w-2xl prose prose-invert prose-p:text-gray-200 prose-pre:bg-transparent prose-pre:p-0 ${msg.role === 'user' ? 'bg-indigo-900/70 text-gray-200' : 'bg-gray-700/50 text-gray-300'}`}>
                                <pre className="whitespace-pre-wrap font-sans">{msg.parts[0].text}</pre>
                            </div>
                        </div>
                    ))}
                     {isLoading && (!messages.length || messages[messages.length - 1].role === 'user') && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0"><Icon icon="sparkles" className="w-5 h-5"/></div>
                            <div className="p-3 rounded-lg bg-gray-700/50">
                                <LoadingSpinner text="Thinking..." />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask for advice on your business plan..."
                            className="flex-1 p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            disabled={isLoading}
                        />
                        <button onClick={handleSendMessage} disabled={isLoading || !userInput.trim()} className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">
                            <Icon icon="send" className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GaiaMentor;