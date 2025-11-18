
import React, { useState, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getInvestorMatches, getPitchDeckReview } from '../services/geminiService';
import Icon from '../components/Icon';

const Dashboard: React.FC = () => {
    const [pitch, setPitch] = useState('');
    const [review, setReview] = useState('');
    const [isReviewLoading, setIsReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState('');

    const [startupDescription, setStartupDescription] = useState('');
    const [matches, setMatches] = useState<any[]>([]);
    const [isMatchLoading, setIsMatchLoading] = useState(false);
    const [matchError, setMatchError] = useState('');

    const handlePitchReview = useCallback(async () => {
        if (!pitch) return;
        setIsReviewLoading(true);
        setReviewError('');
        setReview('');
        try {
            const result = await getPitchDeckReview(pitch);
            setReview(result);
        } catch (error) {
            setReviewError('Failed to get pitch review. Please try again.');
            console.error(error);
        } finally {
            setIsReviewLoading(false);
        }
    }, [pitch]);

    const handleFindMatches = useCallback(async () => {
        if (!startupDescription) return;
        setIsMatchLoading(true);
        setMatchError('');
        setMatches([]);
        try {
            const result = await getInvestorMatches(startupDescription);
            setMatches(result);
        } catch (error) {
            setMatchError('Failed to find matches. Please try again.');
            console.error(error);
        } finally {
            setIsMatchLoading(false);
        }
    }, [startupDescription]);

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold text-white mb-2">Welcome to the Hub</h2>
                <p className="text-gray-400">Your AI-powered toolkit for startup success.</p>
            </div>

            {/* Investor Matching */}
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">AI Investor Matching</h3>
                <textarea
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    rows={4}
                    placeholder="Describe your startup in a few sentences. e.g., 'A SaaS platform for real-time carbon footprint tracking for small businesses.'"
                    value={startupDescription}
                    onChange={(e) => setStartupDescription(e.target.value)}
                />
                <button
                    onClick={handleFindMatches}
                    disabled={isMatchLoading || !startupDescription}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isMatchLoading ? 'Searching...' : 'Find Matches'}
                </button>
                {matchError && <p className="text-red-400 mt-4">{matchError}</p>}
                {isMatchLoading && <div className="mt-4"><LoadingSpinner text="Analyzing and matching..." /></div>}
                {matches.length > 0 && (
                    <div className="mt-6 space-y-4">
                        <h4 className="font-semibold">Potential Investor Matches:</h4>
                        {matches.map((match, index) => (
                            <div key={index} className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                                <p className="font-bold text-indigo-300">{match.name}</p>
                                <p className="text-sm text-gray-300"><strong>Focus:</strong> {match.focus}</p>
                                <p className="text-sm text-gray-400 mt-1"><strong>Why it's a match:</strong> {match.reason}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pitch Deck Review */}
            <div className="bg-gray-800/50 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-semibold text-indigo-400 mb-4">Instant Pitch Review</h3>
                <textarea
                    className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    rows={8}
                    placeholder="Paste your elevator pitch or a summary of your pitch deck here..."
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                />
                <button
                    onClick={handlePitchReview}
                    disabled={isReviewLoading || !pitch}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {isReviewLoading ? 'Analyzing...' : 'Get Feedback'}
                </button>
                {reviewError && <p className="text-red-400 mt-4">{reviewError}</p>}
                {isReviewLoading && <div className="mt-4"><LoadingSpinner text="Reviewing your pitch..." /></div>}
                {review && (
                    <div className="mt-6 prose prose-invert prose-p:text-gray-300 prose-strong:text-white prose-headings:text-indigo-300 bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                        <pre className="whitespace-pre-wrap font-sans text-gray-300">{review}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
