import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, where, updateDoc, arrayUnion } from 'firebase/firestore';

// --- Firebase Configuration ---
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBazllEufviy3hnnv4tQgpoBAKl3y0LQ6c",
    authDomain: "portfolio-sim-b5a6a.firebaseapp.com",
    projectId: "portfolio-sim-b5a6a",
    storageBucket: "portfolio-sim-b5a6a.firebasestorage.app",
    messagingSenderId: "691921863009",
    appId: "1:691921863009:web:c9daa1a696102358950520",
    measurementId: "G-M1Q5LGXM3W"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// --- Asset Classes & Game Settings ---
const ASSET_CLASSES = {
    debt: ['Money Market Funds', 'Govt. Security', 'Corp AAA', 'Corp BBB', 'Corp CCC'],
    equity: ['Capital Goods', 'Finance', 'Defense'],
    others: ['Agri. Comm', 'Metals', 'Gold-ETF']
};
const ALL_ASSETS = [...ASSET_CLASSES.debt, ...ASSET_CLASSES.equity, ...ASSET_CLASSES.others];

const BUSINESS_CYCLES = ['Recession', 'Trough', 'Recovery', 'Growth', 'Peak'];
const MARKETS = ['Indian', 'US', 'Global'];

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [view, setView] = useState('login'); // login, admin, player
    const [gameId, setGameId] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [error, setError] = useState('');
    const [authError, setAuthError] = useState(''); // State for authentication errors

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setAuthError('');
            } else {
                signInAnonymously(auth).catch(error => {
                    console.error("Anonymous sign-in failed:", error);
                    if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
                        setAuthError('Authentication failed. Please make sure "Anonymous" sign-in is enabled in your Firebase project settings.');
                    } else {
                        setAuthError(`An unexpected authentication error occurred: ${error.message}`);
                    }
                });
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (role) => {
        setError('');
        if (!isAuthReady || !user) {
            setError('Authenticating... Please try again in a moment.');
            return;
        }

        if (role === 'admin') {
            setView('admin');
        } else {
            if (!gameId.trim() || !playerName.trim()) {
                setError('Please enter both Game ID and your name.');
                return;
            }
            try {
                const gameRef = doc(db, "games", gameId);
                const gameSnap = await getDoc(gameRef);

                if (!gameSnap.exists()) {
                    setError('Game not found. Please check the Game ID.');
                    return;
                }
                
                const gameData = gameSnap.data();
                if (gameData.status !== 'pending') {
                    setError('This game has already started or is finished.');
                    return;
                }

                if (!gameData.players.find(p => p.name === playerName)) {
                     await updateDoc(gameRef, {
                        players: arrayUnion({
                            uid: user.uid,
                            name: playerName,
                            portfolioValue: gameData.settings.initialInvestment,
                            allocations: {}
                        })
                    });
                }
                setView('player');

            } catch (err) {
                console.error("Error joining game: ", err);
                setError('Failed to join the game. Please try again.');
            }
        }
    };

    const handleLogout = () => {
        setView('login');
        setGameId('');
        setPlayerName('');
        setError('');
    };

    if (authError) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="w-full max-w-lg p-8 space-y-4 bg-red-800 rounded-2xl shadow-lg text-center">
                    <h1 className="text-2xl font-bold text-white">Authentication Error</h1>
                    <p className="text-red-200">{authError}</p>
                    <div className="text-left bg-gray-900 p-4 rounded-lg mt-4">
                        <p className="font-semibold text-gray-300">How to fix:</p>
                        <ol className="list-decimal list-inside text-gray-400 mt-2 space-y-1">
                            <li>Go to your Firebase Console.</li>
                            <li>Navigate to the <strong>Authentication</strong> section.</li>
                            <li>Click on the <strong>Sign-in method</strong> tab.</li>
                            <li>Find <strong>Anonymous</strong> in the provider list and enable it.</li>
                            <li>Refresh this page.</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (view) {
            case 'admin':
                return <AdminDashboard user={user} onLogout={handleLogout} />;
            case 'player':
                return <PlayerDashboard user={user} gameId={gameId} playerName={playerName} onLogout={handleLogout} />;
            default:
                return (
                    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                        <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-lg">
                            <h1 className="text-4xl font-bold text-center text-cyan-400">Portfolio Simulation</h1>
                            {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                            
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold text-center">Join a Game</h2>
                                <input
                                    type="text"
                                    placeholder="Enter Game ID"
                                    value={gameId}
                                    onChange={(e) => setGameId(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Enter Your Name"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button 
                                    onClick={() => handleLogin('player')} 
                                    disabled={!isAuthReady}
                                    className="w-full px-4 py-3 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    {isAuthReady ? 'Join as Player' : 'Authenticating...'}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-800 text-gray-400">or</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-semibold text-center">Admin Panel</h2>
                                <button 
                                    onClick={() => handleLogin('admin')} 
                                    disabled={!isAuthReady}
                                    className="w-full px-4 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    {isAuthReady ? 'Login as Admin' : 'Authenticating...'}
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return <div className="font-sans bg-gray-100 min-h-screen">{renderContent()}</div>;
}

// --- Admin Dashboard Component ---
function AdminDashboard({ user, onLogout }) {
    const [gameSettings, setGameSettings] = useState({ rounds: 5, initialInvestment: 10000000 });
    const [roundSettings, setRoundSettings] = useState(Array(5).fill({ cycle: BUSINESS_CYCLES[0], market: MARKETS[0] }));
    const [createdGameId, setCreatedGameId] = useState(null);
    const [activeGames, setActiveGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [adminError, setAdminError] = useState('');

    useEffect(() => {
        const q = query(collection(db, "games"), where("adminId", "==", user.uid));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const games = [];
            querySnapshot.forEach((doc) => {
                games.push({ id: doc.id, ...doc.data() });
            });
            setActiveGames(games);
        }, (error) => {
            console.error("Error fetching active games:", error);
            setAdminError("Could not fetch your games.");
        });
        return () => unsubscribe();
    }, [user.uid]);

    const handleRoundSettingChange = (index, field, value) => {
        const newSettings = [...roundSettings];
        newSettings[index] = { ...newSettings[index], [field]: value };
        setRoundSettings(newSettings);
    };

    const handleCreateGame = async () => {
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameData = {
            adminId: user.uid,
            settings: gameSettings,
            roundSettings: roundSettings.slice(0, gameSettings.rounds),
            generatedNews: {},
            assetReturns: {},
            currentRound: 1,
            players: [],
            leaderboard: [],
            status: 'pending'
        };
        try {
            await setDoc(doc(db, "games", newGameId), gameData);
            setCreatedGameId(newGameId);
        } catch (error) {
            console.error("Error creating game: ", error);
            setAdminError("Failed to create the game.");
        }
    };
    
    const handleStartGame = async () => {
        if (!selectedGame) return;
        try {
            const initialLeaderboard = [...selectedGame.players].sort((a, b) => b.portfolioValue - a.portfolioValue);
            await updateDoc(doc(db, "games", selectedGame.id), { 
                status: 'active',
                leaderboard: initialLeaderboard
            });
        } catch (error) {
            console.error("Error starting game: ", error);
            setAdminError("Failed to start the game.");
        }
    };

    const generateAssetReturns = async (cycle, market) => {
        const properties = ALL_ASSETS.reduce((acc, asset) => {
            acc[asset] = { type: "NUMBER", description: `The percentage return for ${asset}` };
            return acc;
        }, {});

        const schema = {
            type: "OBJECT",
            properties,
            required: ALL_ASSETS
        };

        const prompt = `You are an economic data generator for a portfolio management simulation. Based on a ${cycle} phase in the ${market} market, generate a plausible set of annual percentage returns for the following asset classes: ${ALL_ASSETS.join(', ')}. Provide the output as a JSON object that strictly follows the provided schema.`;

        try {
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
            
            const result = await response.json();
            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!jsonText) throw new Error("No content received from API.");
            
            return JSON.parse(jsonText);

        } catch (error) {
            console.error("Error generating asset returns:", error);
            setAdminError("AI failed to generate asset returns. Please try again.");
            return null;
        }
    };

    const handleAdvanceRound = async () => {
        if (!selectedGame || selectedGame.currentRound > selectedGame.settings.rounds) return;
        setIsLoading(true);
        setAdminError('');

        // Generate returns for the current round
        const roundIndex = selectedGame.currentRound - 1;
        const { cycle, market } = selectedGame.roundSettings[roundIndex];
        const newReturns = await generateAssetReturns(cycle, market);

        if (!newReturns) {
            setIsLoading(false);
            return; // Stop if AI call failed
        }
        
        // Use the newly generated returns to calculate portfolio values
        const updatedPlayers = selectedGame.players.map(player => {
            const playerAllocations = player.allocations[`round${selectedGame.currentRound}`] || {};
            let growth = 0;
            for (const asset in newReturns) {
                const allocationPercentage = (playerAllocations[asset] || 0) / 100;
                const assetReturn = (newReturns[asset] || 0) / 100;
                growth += allocationPercentage * assetReturn;
            }
            const newPortfolioValue = player.portfolioValue * (1 + growth);
            return { ...player, portfolioValue: newPortfolioValue };
        });

        const newLeaderboard = [...updatedPlayers].sort((a, b) => b.portfolioValue - a.portfolioValue);
        
        const isLastRound = selectedGame.currentRound === selectedGame.settings.rounds;

        try {
            await updateDoc(doc(db, "games", selectedGame.id), {
                [`assetReturns.round${selectedGame.currentRound}`]: newReturns,
                players: updatedPlayers,
                leaderboard: newLeaderboard,
                currentRound: selectedGame.currentRound + 1,
                status: isLastRound ? 'finished' : 'active'
            });
        } catch (error) {
            console.error("Error advancing round: ", error);
            setAdminError("Failed to save round data.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-cyan-400">Admin Dashboard</h1>
                <button onClick={onLogout} className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-colors">Logout</button>
            </div>
            {adminError && <p className="mb-4 text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{adminError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-indigo-400">Create New Game</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 font-medium">Rounds</label>
                            <input type="number" value={gameSettings.rounds} onChange={(e) => setGameSettings({...gameSettings, rounds: parseInt(e.target.value)})} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"/>
                        </div>
                        <div>
                            <label className="block mb-1 font-medium">Initial Investment</label>
                            <input type="number" value={gameSettings.initialInvestment} onChange={(e) => setGameSettings({...gameSettings, initialInvestment: parseInt(e.target.value)})} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"/>
                        </div>
                        {Array.from({ length: gameSettings.rounds }).map((_, i) => (
                            <div key={i} className="p-3 bg-gray-700/50 rounded-lg">
                                <label className="block mb-2 font-bold text-gray-300">Round {i + 1} Settings</label>
                                <div className="space-y-2">
                                    <select value={roundSettings[i]?.cycle} onChange={e => handleRoundSettingChange(i, 'cycle', e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600">
                                        {BUSINESS_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select value={roundSettings[i]?.market} onChange={e => handleRoundSettingChange(i, 'market', e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600">
                                        {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                        <button onClick={handleCreateGame} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold transition-colors">Create Game</button>
                        {createdGameId && <p className="mt-4 p-3 bg-green-900/50 rounded-lg text-center">Game Created! ID: <strong className="text-yellow-300">{createdGameId}</strong></p>}
                    </div>
                </div>

                <div className="md:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Manage Active Game</h2>
                    <select onChange={(e) => setSelectedGame(activeGames.find(g => g.id === e.target.value))} className="w-full p-3 mb-4 bg-gray-700 rounded-lg border border-gray-600">
                        <option value="">Select a game to manage</option>
                        {activeGames.map(game => <option key={game.id} value={game.id}>{game.id}</option>)}
                    </select>

                    {selectedGame && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-xl">Game ID: <strong className="text-yellow-300">{selectedGame.id}</strong></p>
                                <p className="text-xl">Round: <strong className="text-green-400">{selectedGame.currentRound > selectedGame.settings.rounds ? 'Finished' : selectedGame.currentRound}</strong></p>
                                <div className="space-x-2">
                                    {selectedGame.status === 'pending' && <button onClick={handleStartGame} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold">Start Game</button>}
                                    {selectedGame.status === 'active' && <button onClick={handleAdvanceRound} disabled={isLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold disabled:bg-gray-500">{isLoading ? 'Generating...' : 'Advance to Next Round'}</button>}
                                </div>
                            </div>
                             <Leaderboard game={selectedGame} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Player Dashboard Component ---
function PlayerDashboard({ user, gameId, playerName, onLogout }) {
    const [game, setGame] = useState(null);
    const [activeTab, setActiveTab] = useState('portfolio');

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "games", gameId), (doc) => {
            setGame({ id: doc.id, ...doc.data() });
        }, (error) => {
            console.error("Error fetching game data:", error);
        });
        return () => unsub();
    }, [gameId]);

    if (!game) {
        return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="text-xl font-semibold text-white">Loading Game Data...</div></div>;
    }
    
    const player = game.players.find(p => p.name === playerName);
    
    if (!player) {
         return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><div className="text-xl font-semibold text-red-400">Error: Could not find your player data. Please try re-joining.</div></div>;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'portfolio':
                return <PortfolioDecisions game={game} user={user} player={player} />;
            case 'competitors':
                return <ViewCompetitors game={game} currentPlayerName={playerName}/>;
            case 'leaderboard':
                return <Leaderboard game={game} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <div className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-8 text-cyan-400">P-Sim</h2>
                    <nav className="space-y-4">
                        <button onClick={() => setActiveTab('portfolio')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'portfolio' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Portfolio Decisions</button>
                        <button onClick={() => setActiveTab('competitors')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'competitors' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>View Competitors</button>
                        <button onClick={() => setActiveTab('leaderboard')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'leaderboard' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Leaderboard</button>
                    </nav>
                </div>
                <div>
                    <div className="text-gray-400 mb-4">
                        <p>Player: {playerName}</p>
                        <p>Game ID: {gameId}</p>
                    </div>
                    <button onClick={onLogout} className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-bold transition-colors">Logout</button>
                </div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto">
                {renderTabContent()}
            </div>
        </div>
    );
}

// --- Portfolio Decisions Component (with AI News Generation) ---
function PortfolioDecisions({ game, user, player }) {
    const [allocations, setAllocations] = useState({});
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState({text: '', type: ''});
    const [currentNews, setCurrentNews] = useState('Loading news...');

    // AI News Generation Logic
    useEffect(() => {
        const generateNews = async (cycle, market) => {
            const prompt = `You are a financial news generator for a portfolio management simulation. Generate a short, realistic news headline and a brief market summary (2-3 sentences) for the ${market} market which is currently in a ${cycle} phase of the business cycle. The news should give clues about how different asset classes like debt, equity, and commodities might perform.`;
            
            try {
                const payload = { contents: [{ parts: [{ text: prompt }] }] };
                const apiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
                const result = await response.json();
                const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (text) {
                    await updateDoc(doc(db, "games", game.id), {
                        [`generatedNews.round${game.currentRound}`]: text
                    });
                } else {
                    throw new Error("No content received from API.");
                }
            } catch (error) {
                console.error("Error generating news:", error);
                setCurrentNews("Could not generate news. The market is in a " + cycle + " phase. Please invest accordingly.");
            }
        };

        const roundIndex = game.currentRound - 1;
        const newsForRound = game.generatedNews?.[`round${game.currentRound}`];

        if (newsForRound) {
            setCurrentNews(newsForRound);
        } else if (game.status === 'active' && game.roundSettings?.[roundIndex]) {
            setCurrentNews('Generating the latest market news...');
            const { cycle, market } = game.roundSettings[roundIndex];
            generateNews(cycle, market);
        } else if (game.status === 'finished') {
            setCurrentNews('The game has finished. Thank you for playing!');
        } else {
            setCurrentNews('Waiting for the game to start to get the latest news.');
        }

    }, [game.currentRound, game.id, game.generatedNews, game.status, game.roundSettings]);


    useEffect(() => {
        if (player?.allocations?.[`round${game.currentRound}`]) {
            const currentAllocations = player.allocations[`round${game.currentRound}`];
            setAllocations(currentAllocations);
            setTotal(Object.values(currentAllocations).reduce((sum, val) => sum + (val || 0), 0));
        } else {
            const initialAllocations = ALL_ASSETS.reduce((acc, asset) => ({ ...acc, [asset]: 0 }), {});
            setAllocations(initialAllocations);
            setTotal(0);
        }
    }, [game.currentRound, player]);

    const handleAllocationChange = (asset, value) => {
        const newAllocations = { ...allocations, [asset]: parseInt(value) || 0 };
        setAllocations(newAllocations);
        setTotal(Object.values(newAllocations).reduce((sum, val) => sum + val, 0));
    };

    const handleSave = async () => {
        if (total !== 100) {
            setMessage({text: "Total allocation must be 100%.", type: 'error'});
            return;
        }

        const playerIndex = game.players.findIndex(p => p.uid === player.uid);
        if (playerIndex === -1) {
            setMessage({text: "Error finding your player data.", type: 'error'});
            return;
        }
        
        const updatedPlayers = [...game.players];
        if (!updatedPlayers[playerIndex].allocations) {
            updatedPlayers[playerIndex].allocations = {};
        }
        updatedPlayers[playerIndex].allocations[`round${game.currentRound}`] = allocations;

        try {
            await updateDoc(doc(db, "games", game.id), { players: updatedPlayers });
            setMessage({text: "Portfolio saved successfully!", type: 'success'});
        } catch (error) {
            console.error("Error saving portfolio: ", error);
            setMessage({text: "Failed to save portfolio.", type: 'error'});
        }
    };
    
    const isRoundSubmitted = player.allocations && player.allocations[`round${game.currentRound}`];
    const isGameFinished = game.status === 'finished' || game.currentRound > game.settings.rounds;

    return (
        <div>
            <div className="bg-gray-800 p-6 rounded-2xl mb-8">
                <h2 className="text-xl font-bold text-indigo-400 mb-2">News - Round {isGameFinished ? game.settings.rounds : game.currentRound}</h2>
                <p className="whitespace-pre-wrap">{currentNews}</p>
            </div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <p className="text-gray-400">Portfolio Value</p>
                    <p className="text-4xl font-bold text-green-400">₹{player.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-right">
                    <p className="text-gray-400">Total Allocation</p>
                    <p className={`text-4xl font-bold ${total === 100 ? 'text-green-400' : 'text-red-400'}`}>{total}%</p>
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(ASSET_CLASSES).map(([category, assets]) => (
                    <div key={category} className="bg-gray-800 p-6 rounded-2xl">
                        <h3 className="text-2xl font-bold capitalize mb-4 text-cyan-400">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {assets.map(asset => (
                                <div key={asset}>
                                    <label className="block mb-2 font-medium">{asset}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={allocations[asset] || 0}
                                        onChange={(e) => handleAllocationChange(asset, e.target.value)}
                                        className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                        disabled={isRoundSubmitted || game.status !== 'active'}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 text-center">
                 {message.text && <p className={`mb-4 text-lg ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}
                 {isGameFinished && <p className="text-green-400 text-lg font-bold">The game has finished. Check the final leaderboard!</p>}
                 {game.status === 'pending' && <p className="text-yellow-400 text-lg">The game has not started yet. Please wait for the admin.</p>}
                 {isRoundSubmitted && game.status === 'active' && <p className="text-green-400 text-lg">Your portfolio for Round {game.currentRound} is submitted. Waiting for the next round.</p>}
                 {!isRoundSubmitted && game.status === 'active' && (
                    <button onClick={handleSave} className="px-10 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold text-xl transition-colors">
                        Save Portfolio for Round {game.currentRound}
                    </button>
                )}
            </div>
        </div>
    );
}

// --- View Competitors Component ---
function ViewCompetitors({ game, currentPlayerName }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const relevantRound = game.currentRound > 1 ? game.currentRound - 1 : 1;
    const playerToShow = selectedPlayer || game.players.find(p => p.name !== currentPlayerName);

    if (!playerToShow) {
        return (
            <div className="bg-gray-800 p-8 rounded-2xl">
                <h2 className="text-3xl font-bold mb-6 text-indigo-400">View Competitor</h2>
                <p className="text-center text-gray-400 mt-8">There are no other players in the game yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-indigo-400">View Competitor</h2>
            <select 
                onChange={(e) => setSelectedPlayer(game.players.find(p => p.name === e.target.value))} 
                className="w-full md:w-1/3 p-3 mb-8 bg-gray-700 rounded-lg border border-gray-600"
                value={playerToShow.name}
            >
                {game.players.filter(p => p.name !== currentPlayerName).map(p => (
                    <option key={p.uid} value={p.name}>{p.name}</option>
                ))}
            </select>

            {playerToShow.allocations?.[`round${relevantRound}`] ? (
                <div>
                     <p className="text-xl mb-4">Showing allocations for <strong className="text-yellow-300">{playerToShow.name}</strong> from Round {relevantRound}</p>
                     <div className="text-center p-4 bg-gray-900 rounded-lg mb-6">
                        <p className="text-gray-400">Portfolio Value</p>
                        <p className="text-2xl font-bold text-green-400">₹{playerToShow.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                     </div>
                     <div className="space-y-6">
                        {Object.entries(ASSET_CLASSES).map(([category, assets]) => (
                             <div key={category}>
                                <h3 className="text-xl font-bold capitalize mb-3 text-cyan-400">{category}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     {assets.map(asset => (
                                         <div key={asset} className="bg-gray-700 p-4 rounded-lg text-center">
                                             <p className="text-gray-300">{asset}</p>
                                             <p className="text-2xl font-bold">{playerToShow.allocations[`round${relevantRound}`][asset] || 0}%</p>
                                         </div>
                                     ))}
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            ) : (
                <p className="text-center text-gray-400 mt-8">Data for {playerToShow.name} is not available for this round yet.</p>
            )}
        </div>
    );
}


// --- Leaderboard Component ---
function Leaderboard({ game }) {
    const relevantRound = game.currentRound > 1 ? game.currentRound - 1 : 0;
    const leaderboardData = game.leaderboard || [];

    return (
        <div className="bg-gray-800 p-8 rounded-2xl mt-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-400">Leaderboard</h2>
            <p className="mb-4 text-gray-400">
                {game.status === 'finished' ? `Final Standings` : (relevantRound > 0 ? `Standings after Round ${relevantRound}` : 'Standings at the start of the game')}
            </p>
            <table className="w-full text-left">
                <thead className="bg-gray-700/50">
                    <tr className="border-b border-gray-600">
                        <th className="p-4 text-lg">Rank</th>
                        <th className="p-4 text-lg">Player Name</th>
                        <th className="p-4 text-lg">Portfolio Value</th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboardData.length > 0 ? leaderboardData.map((player, index) => (
                        <tr key={player.uid} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="p-4 text-xl font-bold">{index + 1}</td>
                            <td className="p-4 text-xl">{player.name}</td>
                            <td className="p-4 text-xl font-semibold text-green-400">₹{player.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="3" className="text-center p-8 text-gray-400">The leaderboard will be populated once the game starts and players join.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
