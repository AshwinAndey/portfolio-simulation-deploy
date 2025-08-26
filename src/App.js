import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, query, updateDoc, deleteDoc } from 'firebase/firestore';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBazllEufviy3hnnv4tQgpoBAKl3y0LQ6c",
    authDomain: "portfolio-sim-b5a6a.firebaseapp.com",
    projectId: "portfolio-sim-b5a6a",
    storageBucket: "portfolio-sim-b5a6a.appspot.com",
    messagingSenderId: "691921863009",
    appId: "1:691921863009:web:c9daa1a696102358950520",
    measurementId: "G-M1Q5LGXM3W"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Asset Classes & Game Settings ---
const ASSET_CLASSES = {
    debt: ['Money Market Funds', 'Govt. Security', 'Corp AAA', 'Corp BBB', 'Corp CCC'],
    equity: ['Capital Goods', 'Finance', 'Defense'],
    others: ['Agri. Comm', 'Metals', 'Gold-ETF']
};
const ALL_ASSETS = [...ASSET_CLASSES.debt, ...ASSET_CLASSES.equity, ...ASSET_CLASSES.others];
const BUSINESS_CYCLES = ['Recession', 'Trough', 'Recovery', 'Growth', 'Peak'];
const MARKETS = ['Indian', 'US', 'Global'];

// --- Hardcoded Admin Credentials ---
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin123";

// --- Rule-Based Scenario Engine ---
const scenarioEngine = {
    getAssetReturns: (cycle) => {
        const rules = {
            Recession: { 'Money Market Funds': [1, 2], 'Govt. Security': [2, 4], 'Corp AAA': [0, 2], 'Corp BBB': [-5, 0], 'Corp CCC': [-20, -10], 'Capital Goods': [-30, -20], Finance: [-35, -25], Defense: [5, 15], 'Agri. Comm': [-5, 5], Metals: [-25, -15], 'Gold-ETF': [10, 20] },
            Trough: { 'Money Market Funds': [0.5, 1.5], 'Govt. Security': [3, 5], 'Corp AAA': [1, 3], 'Corp BBB': [-2, 2], 'Corp CCC': [-15, 0], 'Capital Goods': [-25, -10], Finance: [-30, -15], Defense: [8, 18], 'Agri. Comm': [0, 10], Metals: [-20, -5], 'Gold-ETF': [5, 15] },
            Recovery: { 'Money Market Funds': [1, 2], 'Govt. Security': [1, 3], 'Corp AAA': [3, 6], 'Corp BBB': [5, 10], 'Corp CCC': [10, 25], 'Capital Goods': [20, 40], Finance: [25, 50], Defense: [0, 10], 'Agri. Comm': [5, 15], Metals: [15, 30], 'Gold-ETF': [-5, 5] },
            Growth: { 'Money Market Funds': [2, 3], 'Govt. Security': [0, 2], 'Corp AAA': [4, 7], 'Corp BBB': [8, 15], 'Corp CCC': [15, 30], 'Capital Goods': [25, 50], Finance: [30, 60], Defense: [-5, 5], 'Agri. Comm': [10, 20], Metals: [20, 40], 'Gold-ETF': [-10, 0] },
            Peak: { 'Money Market Funds': [2.5, 4], 'Govt. Security': [-2, 1], 'Corp AAA': [2, 5], 'Corp BBB': [0, 8], 'Corp CCC': [-10, 10], 'Capital Goods': [5, 20], Finance: [0, 25], Defense: [-10, 0], 'Agri. Comm': [0, 10], Metals: [-15, 5], 'Gold-ETF': [-5, 5] }
        };
        
        const cycleRules = rules[cycle] || rules['Growth'];
        const returns = {};

        for (const asset of ALL_ASSETS) {
            const [min, max] = cycleRules[asset];
            returns[asset] = parseFloat((Math.random() * (max - min) + min).toFixed(2));
        }
        return returns;
    },
    getNews: (cycle, market) => {
        const templates = {
            Recession: [
                { headline: `Central Bank Signals Further Rate Cuts Amidst ${market} Economic Downturn`, summary: `Fears of a deepening recession are growing as new data shows rising unemployment and falling industrial output. The central bank is expected to cut interest rates further to stimulate the economy, making government bonds more attractive.`},
                { headline: `${market} Market Enters Bear Territory as GDP Contracts Sharply`, summary: `Investor confidence has hit a new low after official figures confirmed the economy shrank for a second consecutive quarter. Corporate earnings are expected to fall significantly, with cyclical sectors like capital goods and finance hit the hardest.`},
            ],
            Trough: [
                { headline: `Market Volatility Persists in ${market}; Investors Seek Safe Havens`, summary: `Although the pace of economic decline appears to be slowing, uncertainty remains high. Investors are cautiously optimistic but are largely staying in safe-haven assets like gold and high-quality government debt until a clear recovery begins.`},
                { headline: `Signs of Bottoming? ${market} Industrial Production Stabilizes`, summary: `After months of decline, industrial production figures have remained flat, sparking hope that the worst of the downturn may be over. However, credit markets remain tight, and corporate bond defaults are still a major concern.`},
            ],
            Recovery: [
                { headline: `Economic Green Shoots Appear as ${market} Consumer Confidence Rebounds`, summary: `A surprising jump in consumer confidence and retail sales suggests a recovery is underway. Corporate profits are expected to rebound, leading to a rally in equities, particularly in the finance and capital goods sectors.`},
                { headline: `Infrastructure Spending Boosts ${market} Recovery Hopes`, summary: `The government has announced a major infrastructure spending plan, boosting shares in capital goods and metals. This fiscal stimulus is expected to accelerate the economic recovery and increase demand for corporate credit.`},
            ],
            Growth: [
                { headline: `${market} Bull Market Rages on as Corporate Earnings Soar`, summary: `The stock market continues to reach new highs, driven by strong corporate earnings and robust economic growth. Investor appetite for risk is high, with significant inflows into equities and high-yield corporate bonds.`},
                { headline: `Inflation Concerns Rise in ${market} as Economy Overheats`, summary: `Strong economic growth is leading to concerns about rising inflation, prompting the central bank to consider raising interest rates. This could negatively impact government bond prices in the near future.`},
            ],
            Peak: [
                { headline: `Central Bank Hikes Rates to Cool Overheating ${market} Economy`, summary: `In a bid to control inflation, the central bank has raised interest rates for the third time this year. The move has caused jitters in the stock market, with analysts warning that the long period of growth may be coming to an end.`},
                { headline: `Market Volatility Spikes in ${market} Amidst Fears of a Slowdown`, summary: `After a prolonged period of strong performance, the market is showing signs of fatigue. Corporate earnings growth is slowing, and rising interest rates are making debt more expensive, leading to a sell-off in riskier assets.`},
            ]
        };
        const cycleTemplates = templates[cycle] || templates['Growth'];
        const selected = cycleTemplates[Math.floor(Math.random() * cycleTemplates.length)];
        return `${selected.headline}\n\n${selected.summary}`;
    }
};

// --- Main App Component ---
export default function App() {
    const [, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [view, setView] = useState('login');
    const [gameId, setGameId] = useState('');
    const [playerId, setPlayerId] = useState('');
    const [playerPin, setPlayerPin] = useState('');
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [error, setError] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setIsAuthReady(true);
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
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async (role) => {
        setError('');
        if (!isAuthReady) {
            setError('Authenticating... Please try again in a moment.');
            return;
        }
        if (role === 'admin') {
            if (adminUsername === ADMIN_USER && adminPassword === ADMIN_PASS) {
                setView('admin');
            } else {
                setError('Invalid admin credentials.');
            }
        } else {
            if (!gameId.trim() || !playerId.trim() || !playerPin.trim()) {
                setError('Please enter Game ID, Player ID, and PIN.');
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
                const player = gameData.players?.[playerId];

                if (!player) {
                    setError('Player ID not found in this game.');
                    return;
                }
                
                if (player.pin !== playerPin) {
                    setError('Incorrect PIN.');
                    return;
                }
                
                setView('player');
            } catch (err) {
                console.error("Error joining game: ", err);
                setError('Failed to join the game. The client might be offline or Firestore rules may be incorrect.');
            }
        }
    };

    const handleLogout = () => {
        setView('login');
        setGameId('');
        setPlayerId('');
        setPlayerPin('');
        setAdminUsername('');
        setAdminPassword('');
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
                return <AdminDashboard onLogout={handleLogout} />;
            case 'player':
                return <PlayerDashboard gameId={gameId} playerId={playerId} onLogout={handleLogout} />;
            default:
                return (
                    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                        <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-2xl shadow-lg">
                            <h1 className="text-4xl font-bold text-center text-cyan-400">Portfolio Simulation</h1>
                            {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{error}</p>}
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold text-center">Join a Game</h2>
                                <input type="text" placeholder="Enter Game ID" value={gameId} onChange={(e) => setGameId(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input type="text" placeholder="Enter Player ID" value={playerId} onChange={(e) => setPlayerId(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                                <input type="password" placeholder="Enter 4-Digit PIN" value={playerPin} onChange={(e) => setPlayerPin(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" maxLength="4" />
                                <button onClick={() => handleLogin('player')} disabled={!isAuthReady} className="w-full px-4 py-3 font-bold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
                                    {isAuthReady ? 'Join as Player' : 'Authenticating...'}
                                </button>
                            </div>
                            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-400">or</span></div></div>
                            <div className="space-y-6">
                                <h2 className="text-2xl font-semibold text-center">Admin Panel</h2>
                                <input type="text" placeholder="Admin Username" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                <input type="password" placeholder="Admin Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                <button onClick={() => handleLogin('admin')} disabled={!isAuthReady} className="w-full px-4 py-3 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed">
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
function AdminDashboard({ onLogout }) {
    const [gameSettings, setGameSettings] = useState({ rounds: 5, initialInvestment: 10000000 });
    const [roundSettings, setRoundSettings] = useState(Array(5).fill({ cycle: BUSINESS_CYCLES[0], market: MARKETS[0] }));
    const [createdGameId, setCreatedGameId] = useState(null);
    const [activeGames, setActiveGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerId, setNewPlayerId] = useState('');

    useEffect(() => {
        const q = query(collection(db, "games"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setActiveGames(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleCreateGame = async () => {
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameData = {
            settings: gameSettings,
            roundSettings: roundSettings.slice(0, gameSettings.rounds),
            generatedNews: {},
            assetReturns: {},
            currentRound: 1,
            players: {},
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

    const handleAddPlayer = async () => {
        if (!selectedGame || !newPlayerName.trim() || !newPlayerId.trim()) {
            setAdminError("Please select a game and enter a name and ID for the new player.");
            return;
        }
        setAdminError('');
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        const newPlayer = {
            name: newPlayerName,
            pin: pin,
            portfolioValue: selectedGame.settings.initialInvestment,
            allocations: {}
        };
        try {
            await updateDoc(doc(db, "games", selectedGame.id), {
                [`players.${newPlayerId}`]: newPlayer
            });
            setNewPlayerName('');
            setNewPlayerId('');
        } catch (error) {
            console.error("Error adding player:", error);
            setAdminError("Failed to add player. Player ID might already exist.");
        }
    };
    
    const handleStartGame = async () => {
        if (!selectedGame) return;
        await updateDoc(doc(db, "games", selectedGame.id), { status: 'active' });
    };

    const handleDeleteGame = async (gameId) => {
        if (window.confirm(`Are you sure you want to delete game ${gameId}? This action cannot be undone.`)) {
            try {
                await deleteDoc(doc(db, "games", gameId));
                setSelectedGame(null);
            } catch (error) {
                console.error("Error deleting game:", error);
                setAdminError("Failed to delete the game.");
            }
        }
    };

    const handleRoundSettingChange = (index, field, value) => {
        const newSettings = [...roundSettings];
        newSettings[index] = { ...newSettings[index], [field]: value };
        setRoundSettings(newSettings);
    };

    const handleAdvanceRound = async () => {
        if (!selectedGame || selectedGame.currentRound > selectedGame.settings.rounds) return;
        setIsLoading(true);
        setAdminError('');
        
        const roundIndex = selectedGame.currentRound - 1;
        const { cycle } = selectedGame.roundSettings[roundIndex];
        const newReturns = scenarioEngine.getAssetReturns(cycle);

        const gameRef = doc(db, "games", selectedGame.id);
        const gameSnap = await getDoc(gameRef);
        const gameData = gameSnap.data();

        const updatedPlayers = { ...gameData.players };
        for (const pId in updatedPlayers) {
            const player = updatedPlayers[pId];
            const playerAllocations = player.allocations?.[`round${selectedGame.currentRound}`] || {};
            let growth = 0;
            for (const asset in newReturns) {
                const allocationPercentage = (playerAllocations[asset] || 0) / 100;
                const assetReturn = (newReturns[asset] || 0) / 100;
                growth += allocationPercentage * assetReturn;
            }
            updatedPlayers[pId].portfolioValue = player.portfolioValue * (1 + growth);
        }

        const isLastRound = selectedGame.currentRound === selectedGame.settings.rounds;
        await updateDoc(gameRef, {
            [`assetReturns.round${selectedGame.currentRound}`]: newReturns,
            players: updatedPlayers,
            currentRound: selectedGame.currentRound + 1,
            status: isLastRound ? 'finished' : 'active'
        });
        
        setIsLoading(false);
    };

    const playersArray = selectedGame ? Object.entries(selectedGame.players || {}).map(([id, data]) => ({ id, ...data })) : [];

    return (
        <div className="p-8 bg-gray-900 text-white min-h-screen">
            <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold text-cyan-400">Admin Dashboard</h1><button onClick={onLogout} className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-colors">Logout</button></div>
            {adminError && <p className="mb-4 text-red-400 text-center bg-red-900/50 p-3 rounded-lg">{adminError}</p>}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-indigo-400">Create New Game</h2>
                    <div className="space-y-4">
                        <div><label className="block mb-1 font-medium">Rounds</label><input type="number" value={gameSettings.rounds} onChange={(e) => setGameSettings({...gameSettings, rounds: parseInt(e.target.value, 10)})} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"/></div>
                        <div><label className="block mb-1 font-medium">Initial Investment</label><input type="number" value={gameSettings.initialInvestment} onChange={(e) => setGameSettings({...gameSettings, initialInvestment: parseInt(e.target.value, 10)})} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600"/></div>
                        {Array.from({ length: gameSettings.rounds }).map((_, i) => (
                            <div key={i} className="p-3 bg-gray-700/50 rounded-lg"><label className="block mb-2 font-bold text-gray-300">Round {i + 1} Settings</label><div className="space-y-2"><select value={roundSettings[i]?.cycle} onChange={e => handleRoundSettingChange(i, 'cycle', e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600">{BUSINESS_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}</select><select value={roundSettings[i]?.market} onChange={e => handleRoundSettingChange(i, 'market', e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg border border-gray-600">{MARKETS.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>
                        ))}
                        <button onClick={handleCreateGame} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold transition-colors">Create Game</button>
                        {createdGameId && <p className="mt-4 p-3 bg-green-900/50 rounded-lg text-center">Game Created! ID: <strong className="text-yellow-300">{createdGameId}</strong></p>}
                    </div>
                </div>
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-semibold mb-4 text-cyan-400">Manage Active Game</h2>
                    <select onChange={(e) => setSelectedGame(activeGames.find(g => g.id === e.target.value))} className="w-full p-3 mb-4 bg-gray-700 rounded-lg border border-gray-600"><option value="">Select a game to manage</option>{activeGames.map(game => <option key={game.id} value={game.id}>{game.id}</option>)}</select>
                    {selectedGame && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <p className="text-xl">Game ID: <strong className="text-yellow-300">{selectedGame.id}</strong></p>
                                <p className="text-xl">Round: <strong className="text-green-400">{selectedGame.currentRound > selectedGame.settings.rounds ? 'Finished' : selectedGame.currentRound}</strong></p>
                                <div className="space-x-2">
                                    {selectedGame.status === 'pending' && <button onClick={handleStartGame} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold">Start Game</button>}
                                    {selectedGame.status === 'active' && <button onClick={handleAdvanceRound} disabled={isLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold disabled:bg-gray-500">{isLoading ? 'Generating...' : 'Advance Round'}</button>}
                                    <button onClick={() => handleDeleteGame(selectedGame.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold">Delete Game</button>
                                </div>
                            </div>
                            <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-indigo-400">Add New Player</h3>
                                <div className="flex gap-4"><input type="text" placeholder="Player Name" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} className="flex-1 p-2 bg-gray-700 rounded-lg border border-gray-600" /><input type="text" placeholder="Create Player ID" value={newPlayerId} onChange={e => setNewPlayerId(e.target.value)} className="flex-1 p-2 bg-gray-700 rounded-lg border border-gray-600" /><button onClick={handleAddPlayer} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold">Add Player</button></div>
                            </div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-indigo-400">Player Credentials</h3>
                                <div className="bg-gray-900 p-4 rounded-lg max-h-48 overflow-y-auto">
                                    {playersArray.length > 0 ? playersArray.map(p => (<div key={p.id} className="flex justify-between items-center p-2 border-b border-gray-700"><p>{p.name}</p><p className="text-gray-400">ID: <span className="font-mono text-yellow-300">{p.id}</span></p><p className="text-gray-400">PIN: <span className="font-mono text-yellow-300">{p.pin}</span></p></div>)) : <p className="text-gray-500 text-center">No players added yet.</p>}
                                </div>
                            </div>
                            <Leaderboard players={playersArray} gameStatus={selectedGame.status} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Player Dashboard Component ---
function PlayerDashboard({ gameId, playerId, onLogout }) {
    const [game, setGame] = useState(null);
    const [activeTab, setActiveTab] = useState('portfolio');

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "games", gameId), (doc) => {
            setGame({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [gameId]);

    if (!game) {
        return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="text-xl font-semibold text-white">Loading Game Data...</div></div>;
    }

    const player = game.players?.[playerId];
    
    if (!player) {
         return <div className="flex items-center justify-center h-screen bg-gray-900 text-white"><div className="text-xl font-semibold text-red-400">Waiting for player data...</div></div>;
    }

    const playersArray = Object.entries(game.players || {}).map(([id, data]) => ({ id, ...data }));

    const renderTabContent = () => {
        switch (activeTab) {
            case 'portfolio': return <PortfolioDecisions game={game} player={player} playerId={playerId} />;
            case 'competitors': return <ViewCompetitors game={game} players={playersArray} currentPlayerId={playerId} />;
            case 'leaderboard': return <Leaderboard players={playersArray} gameStatus={game.status} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <div className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
                <div><h2 className="text-2xl font-bold mb-8 text-cyan-400">P-Sim</h2><nav className="space-y-4"><button onClick={() => setActiveTab('portfolio')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'portfolio' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Portfolio</button><button onClick={() => setActiveTab('competitors')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'competitors' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Competitors</button><button onClick={() => setActiveTab('leaderboard')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'leaderboard' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Leaderboard</button></nav></div>
                <div><div className="text-gray-400 mb-4"><p>Player: {player.name}</p><p>Game ID: {gameId}</p></div><button onClick={onLogout} className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-bold transition-colors">Logout</button></div>
            </div>
            <div className="flex-1 p-10 overflow-y-auto">{renderTabContent()}</div>
        </div>
    );
}

// --- Portfolio Decisions Component ---
function PortfolioDecisions({ game, player, playerId }) {
    const [allocations, setAllocations] = useState({});
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState({text: '', type: ''});
    const [currentNews, setCurrentNews] = useState('Loading news...');

    useEffect(() => {
        const roundIndex = game.currentRound - 1;
        if (game.status === 'active' && game.roundSettings?.[roundIndex]) {
            const { cycle, market } = game.roundSettings[roundIndex];
            setCurrentNews(scenarioEngine.getNews(cycle, market));
        } else if (game.status === 'finished') {
            setCurrentNews('The game has finished. Thank you for playing!');
        } else {
            setCurrentNews('Waiting for the game to start to get the latest news.');
        }
    }, [game.currentRound, game.status, game.roundSettings]);

    useEffect(() => {
        const currentAllocations = player.allocations?.[`round${game.currentRound}`] || ALL_ASSETS.reduce((acc, asset) => ({ ...acc, [asset]: 0 }), {});
        setAllocations(currentAllocations);
        setTotal(Object.values(currentAllocations).reduce((sum, val) => sum + (val || 0), 0));
    }, [game.currentRound, player.allocations]);

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
        try {
            await updateDoc(doc(db, "games", game.id), {
                [`players.${playerId}.allocations.round${game.currentRound}`]: allocations
            });
            setMessage({text: "Portfolio saved successfully!", type: 'success'});
        } catch (error) {
            console.error("Error saving portfolio: ", error);
            setMessage({text: "Failed to save portfolio.", type: 'error'});
        }
    };
    
    const isRoundSubmitted = player.allocations && player.allocations[`round${game.currentRound}`];
    const isGameFinished = game.status === 'finished';

    return (
        <div>
            <div className="bg-gray-800 p-6 rounded-2xl mb-8"><h2 className="text-xl font-bold text-indigo-400 mb-2">News - Round {isGameFinished ? game.settings.rounds : game.currentRound}</h2><p className="whitespace-pre-wrap">{currentNews}</p></div>
            <div className="flex justify-between items-center mb-8"><div><p className="text-gray-400">Portfolio Value</p><p className="text-4xl font-bold text-green-400">₹{player.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div><div className="text-right"><p className="text-gray-400">Total Allocation</p><p className={`text-4xl font-bold ${total === 100 ? 'text-green-400' : 'text-red-400'}`}>{total}%</p></div></div>
            <div className="space-y-8">{Object.entries(ASSET_CLASSES).map(([category, assets]) => (<div key={category} className="bg-gray-800 p-6 rounded-2xl"><h3 className="text-2xl font-bold capitalize mb-4 text-cyan-400">{category}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{assets.map(asset => (<div key={asset}><label className="block mb-2 font-medium">{asset}</label><input type="number" min="0" max="100" value={allocations[asset] || 0} onChange={(e) => handleAllocationChange(asset, e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" disabled={isRoundSubmitted || game.status !== 'active'}/></div>))}</div></div>))}</div>
            <div className="mt-8 text-center">{message.text && <p className={`mb-4 text-lg ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}{isGameFinished && <p className="text-green-400 text-lg font-bold">The game has finished. Check the final leaderboard!</p>}{game.status === 'pending' && <p className="text-yellow-400 text-lg">The game has not started yet.</p>}{isRoundSubmitted && game.status === 'active' && <p className="text-green-400 text-lg">Your portfolio for Round {game.currentRound} is submitted.</p>}{!isRoundSubmitted && game.status === 'active' && (<button onClick={handleSave} className="px-10 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold text-xl transition-colors">Save Portfolio for Round {game.currentRound}</button>)}</div>
        </div>
    );
}

// --- View Competitors Component ---
function ViewCompetitors({ game, players, currentPlayerId }) {
    const [selectedPlayerId, setSelectedPlayerId] = useState('');

    useEffect(() => {
        const competitor = players.find(p => p.id !== currentPlayerId);
        if (competitor) {
            setSelectedPlayerId(competitor.id);
        }
    }, [players, currentPlayerId]);

    const playerToShow = players.find(p => p.id === selectedPlayerId);
    const competitors = players.filter(p => p.id !== currentPlayerId);

    if (competitors.length === 0) {
        return <div className="bg-gray-800 p-8 rounded-2xl"><h2 className="text-3xl font-bold mb-6 text-indigo-400">View Competitor</h2><p className="text-center text-gray-400 mt-8">No other players have joined yet.</p></div>;
    }

    const relevantRound = game.currentRound > 1 ? game.currentRound - 1 : 1;

    return (
        <div className="bg-gray-800 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-indigo-400">View Competitor</h2>
            <select onChange={(e) => setSelectedPlayerId(e.target.value)} value={selectedPlayerId} className="w-full md:w-1/3 p-3 mb-8 bg-gray-700 rounded-lg border border-gray-600">{competitors.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
            {playerToShow && playerToShow.allocations?.[`round${relevantRound}`] ? (
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
            ) : <p className="text-center text-gray-400 mt-8">Data for {playerToShow?.name} is not available for this round yet.</p>}
        </div>
    );
}

// --- Leaderboard Component ---
function Leaderboard({ players, gameStatus }) {
    const leaderboardData = [...players].sort((a, b) => b.portfolioValue - a.portfolioValue);
    return (
        <div className="bg-gray-800 p-8 rounded-2xl mt-8">
            <h2 className="text-3xl font-bold mb-6 text-indigo-400">Leaderboard</h2>
            <p className="mb-4 text-gray-400">{gameStatus === 'finished' ? `Final Standings` : `Standings`}</p>
            <table className="w-full text-left"><thead className="bg-gray-700/50"><tr><th className="p-4 text-lg">Rank</th><th className="p-4 text-lg">Player Name</th><th className="p-4 text-lg">Portfolio Value</th></tr></thead><tbody>
                {leaderboardData.length > 0 ? leaderboardData.map((player, index) => (<tr key={player.id} className="border-b border-gray-700 hover:bg-gray-700/50"><td className="p-4 text-xl font-bold">{index + 1}</td><td className="p-4 text-xl">{player.name}</td><td className="p-4 text-xl font-semibold text-green-400">₹{player.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>)) : (<tr><td colSpan="3" className="text-center p-8 text-gray-400">Leaderboard will populate as players join and rounds complete.</td></tr>)}
            </tbody></table>
        </div>
    );
}
