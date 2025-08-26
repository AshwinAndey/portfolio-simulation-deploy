import React, { useState, useEffect, useRef } from 'react';
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

// --- Encoded Rule-Based Scenario Engine ---
const scenarioEngine = {
    getAssetReturns: (cycle) => {
        const encodedRules = "eyJSZWNlc3Npb24iOnsiTW9uZXkgTWFya2V0IEZ1bmRzIjp7ImJhc2UiOjEuNSwidm9sIjoyfSwiR292dC4gU2VjdXJpdHkiOnsiYmFzZSI6Mywidm9sIjoyfSwiQ29ycCBBQUEiOnsiYmFzZSI6MSwidm9sIjozfSwiQ29ycCBCQkIiOnsiYmFzZSI6LTMsInZvbCI6NX0sIkNvcnAgQ0NDIjp7ImJhc2UiOi0xNSwidm9sIjoxNX0sIkNhcGl0YWwgR29vZHMiOnsiYmFzZSI6LTI1LCJ2b2wiOjE1fSwiRmluYW5jZSI6eyJiYXNlIjotMzAsInZvbCI6MTV9LCJEZWZlbnNlIjp7ImJhc2UiOjEwLCJ2b2wiOjEwfSwiQWdyaS4gQ29tbSI6eyJiYXNlIjowLCJ2b2wiOjEwfSwiTWV0YWxzIjp7ImJhc2UiOi0yMCwidm9sIjoxNX0sIkdvbGQtRVRGIjp7ImJhc2UiOjE1LCJ2b2wiOjEwfX0sIlRyb3VnaCI6eyJNb25leSBNYXJrZXQgRnVuZHMiOnsiYmFzZSI6MSwidm9sIjoxfSwiR292dC4gU2VjdXJpdHkiOnsiYmFzZSI6NCwidm9sIjoyfSwiQ29ycCBBQUEiOnsiYmFzZSI6Miwidm9sIjozfSwiQ29ycCBCQkIiOnsiYmFzZSI6MCwidm9sIjo1fSwiQ29ycCBDQ0MiOnsiYmFzZSI6LTcsInZvbCI6MjB9LCJDYXBpdGFsIEdvb2RzIjp7ImJhc2UiOi0xNSwidm9sIjoyMH0sIkZpbmFuY2UiOnsiYmFzZSI6LTIwLCJ2b2wiOjI1fSwiRGVmZW5zZSI6eyJiYXNlIjoxMywidm9sIjoxMH0sIkFncmkuIENvbW0iOnsiYmFzZSI6NSwidm9sIjoxNX0sIk1ldGFscyI6eyJiYXNlIjotMTAsInZvbCI6MjV9LCJHb2xkLUVURiI6eyJiYXNlIjoxMCwidm9sIjoxMH19LCJSZWNvdmVyeSI6eyJNb25leSBNYXJrZXQgRnVuZHMiOnsiYmFzZSI6MS41LCJ2b2wiOjF9LCJHb3Z0LiBTZWN1cml0eSI6eyJiYXNlIjoyLCJ2b2wiOjN9LCJDb3JwIEFBQSI6eyJiYXNlIjo0LjUsInZvbCI6NH0sIkNvcnAgQkJCIjp7ImJhc2UiOjcuNSwidm9sIjo4fSwiQ29ycCBDQ0MiOnsiYmFzZSI6MTgsInZvbCI6MjB9LCJDYXBpdGFsIEdvb2RzIjp7ImJhc2UiOjMwLCJ2b2wiOjI1fSwiRmluYW5jZSI6eyJiYXNlIjozNy41LCJ2b2wiOjMwfSwiRGVmZW5zZSI6eyJiYXNlIjo1LCJ2b2wiOjEwfSwiQWdyaS4gQ29tbSI6eyJiYXNlIjoxMCwidm9sIjoxNX0sIk1ldGFscyI6eyJiYXNlIjoyMi41LCJ2b2wiOjI1fSwiR29sZC1FVEYiOnsiYmFzZSI6MCwidm9sIjoxMH19LCJHcm93dGgiOnsiTW9uZXkgTWFya2V0IEZ1bmRzIjp7ImJhc2UiOjIuNSwidm9sIjoxfSwiR292dC4gU2VjdXJpdHkiOnsiYmFzZSI6MSwidm9sIjozfSwiQ29ycCBBQUEiOnsiYmFzZSI6NS41LCJ2b2wiOjR9LCJDb3JwIEJCQiI6eyJiYXNlIjoxMS41LCJ2b2wiOjEwfSwiQ29ycCBDQ0MiOnsiYmFzZSI6MjIsInZvbCI6MjV9LCJDYXBpdGFsIEdvb2RzIjp7ImJhc2UiOjM3LjUsInZvbCI6MzB9LCJGaW5hbmNlIjp7ImJhc2UiOjQ1LCJ2b2wiOjQwfSwiRGVmZW5zZSI6eyJiYXNlIjowLCJ2b2wiOjEwfSwiQWdyaS4gQ29tbSI6eyJiYXNlIjoxNSwidm9sIjoxNX0sIk1ldGFscyI6eyJiYXNlIjozMCwidm9sIjozMH0sIkdvbGQtRVRGIjp7ImJhc2UiOi01LCJ2b2wiOjEwfX0sIlBlYWsiOnsiTW9uZXkgTWFya2V0IEZ1bmRzIjp7ImJhc2UiOjMuMjUsInZvbCI6MS41fSwiR292dC4gU2VjdXJpdHkiOnsiYmFzZSI6LTAuNSwidm9sIjo0fSwiQ29ycCBBQUEiOnsiYmFzZSI6My41LCJ2b2wiOjV9LCJDb3JwIEJCQiI6eyJiYXNlIjo0LCJ2b2wiOjEyfSwiQ29ycCBDQ0MiOnsiYmFzZSI6MCwidm9sIjoyNX0sIkNhcGl0YWwgR29vZHMiOnsiYmFzZSI6MTIuNSwidm9sIjoyMH0sIkZpbmFuY2UiOnsiYmFzZSI6MTIuNSwidm9sIjozMH0sIkRlZmVuc2UiOnsiYmFzZSI6LTUsInZvbCI6MTB9LCJBZ3JpLiBDb21tIjp7ImJhc2UiOjUsInZvbCI6MTV9LCJNZXRhbHMiOnsiYmFzZSI6LTUsInZvbCI6MjV9LCJHb2xkLUVURiI6eyJiYXNlIjowLCJ2b2wiOjE1fX19";
        const rules = JSON.parse(atob(encodedRules));
        const cycleRules = rules[cycle] || rules['Growth'];
        const returns = {};
        for (const asset of ALL_ASSETS) {
            const { base, vol } = cycleRules[asset];
            const returnValue = base + (Math.random() - 0.5) * vol;
            returns[asset] = parseFloat(returnValue.toFixed(2));
        }
        return returns;
    },
    getNews: (cycle, market) => {
        const encodedTemplates = "eyJSZWNlc3Npb24iOlt7ImhlYWRsaW5lIjoiQ2VudHJhbCBCYW5rIFNpZ25hbHMgRnVydGhlciBSYXRlIEN1dHMgQW1pZHN0IHt7bWFya2V0fX0gRWNvbm9taWMgRG93bnR1cm4iLCJzdW1tYXJ5IjoiRmVhcnMgb2YgYSBkZWVwZW5pbmcgcmVjZXNzaW9uIGFyZSBncm93aW5nIGFzIG5ldyBkYXRhIHNob3dzIHJpc2luZyB1bmVtcGxveW1lbnQgYW5kIGZhbGxpbmcgaW5kdXN0cmlhbCBvdXRwdXQuIFRoZSBjZW50cmFsIGJhbmsgaXMgZXhwZWN0ZWQgdG8gY3V0IGludGVyZXN0IHJhdGVzIGZ1cnRoZXIgdG8gc3RpbXVsYXRlIHRoZSBlY29ub215LCBtYWtpbmcgZ292ZXJubWVudCBib25kcyBtb3JlIGF0dHJhY3RpdmUuIn0seyJoZWFkbGluZSI6Int7bWFya2V0fX0gTWFya2V0IEVudGVycyBCZWFyIFRlcnJpdG9yeSBhcyBHRFAgQ29udHJhY3RzIFNoYXJwbHkiLCJzdW1tYXJ5IjoiSW52ZXN0b3IgY29uZmlkZW5jZSBoYXMgaGl0IGEgbmV3IGxvdyBhZnRlciBvZmZpY2lhbCBmaWd1cmVzIGNvbmZpcm1lZCB0aGUgZWNvbm9teSBzaHJhbmsgZm9yIGEgc2Vjb25kIGNvbnNlY3V0aXZlIHF1YXJ0ZXIuIENvcnBvcmF0ZSBlYXJuaW5ncyBhcmUgZXhwZWN0ZWQgdG8gZmFsbCBzaWduaWZpY2FudGx5LCB3aXRoIGN5Y2xpY2FsIHNlY3RvcnMgbGlrZSBjYXBpdGFsIGdvb2RzIGFuZCBmaW5hbmNlIGhpdCB0aGUgaGFyZGVzdC4ifV0sIlRyb3VnaCI6W3siaGVhZGxpbmUiOiJNYXJrZXQgVm9sYXRpbGl0eSBQZXJzaXN0cyBpbiB7e21hcmtldH19OyBJbnZlc3RvcnMgU2VlayBTYWZlIEhhdmVucyIsInN1bW1hcnkiOiJBbHRob3VnaCB0aGUgcGFjZSBvZiBlY29ub21pYyBkZWNsaW5lIGFwcGVhcnMgdG8gYmUgc2xvd2luZywgdW5jZXJ0YWludHkgcmVtYWlucyBoaWdoLiBJbnZlc3RvcnMgYXJlIGNhdXRpb3VzbHkgb3B0aW1pc3RpYyBidXQgYXJlIGxhcmdlbHkgc3RheWluZyBpbiBzYWZlLWhhdmVuIGFzc2V0cyBsaWtlIGdvbGQgYW5kIGhpZ2gtcXVhbGl0eSBnb3Zlcm5tZW50IGRlYnQgdW50aWwgYSBjbGVhciByZWNvdmVyeSBiZWdpbnMuIn0seyJoZWFkbGluZSI6IlNpZ25zIG9mIEJvdHRvbWluZz8ge3ttYXJrZXR9fSBJbmR1c3RyaWFsIFByb2R1Y3Rpb24gU3RhYmlsaXplcyIsInN1bW1hcnkiOiJBZnRlciBtb250aHMgb2YgZGVjbGluZSwgaW5kdXN0cmlhbCBwcm9kdWN0aW9uIGZpZ3VyZXMgaGF2ZSByZW1haW5lZCBmbGF0LCBzcGFya2luZyBob3BlIHRoYXQgdGhlIHdvcnN0IG9mIHRoZSBkb3dudHVybiBtYXkgYmUgb3Zlci4gSG93ZXZlciwgY3JlZGl0IG1hcmtldHMgcmVtYWluIHRpZ2h0LCBhbmQgY29ycG9yYXRlIGJvbmQgZGVmYXVsdHMgYXJlIHN0aWxsIGEgbWFqb3IgY29uY2Vybi4ifV0sIlJlY292ZXJ5IjpbeyJoZWFkbGluZSI6IkVjb25vbWljIEdyZWVuIFNob290cyBBcHBlYXIgYXMge3ttYXJrZXR9fSBDb25zdW1lciBDb25maWRlbmNlIFJlYm91bmRzIiwic3VtbWFyeSI6IkEgc3VycHJpc2luZyBqdW1wIGluIGNvbnN1bWVyIGNvbmZpZGVuY2UgYW5kIHJldGFpbCBzYWxlcyBzdWdnZXN0cyBhIHJlY292ZXJ5IGlzIHVuZGVyd2F5LiBDb3Jwb3JhdGUgcHJvZml0cyBhcmUgZXhwZWN0ZWQgdG8gcmVib3VuZCwgbGVhZGluZyB0byBhIHJhbGx5IGluIGVxdWl0aWVzLCBwYXJ0aWN1bGFybHkgaW4gdGhlIGZpbmFuY2UgYW5kIGNhcGl0YWwgZ29vZHMgc2VjdG9ycy4ifSx7ImhlYWRsaW5lIjoiSW5mcmFzdHJ1Y3R1cmUgU3BlbmRpbmcgQm9vc3RzIHt7bWFya2V0fX0gUmVjb3ZlcnkgSG9wZXMiLCJzdW1tYXJ5IjoiVGhlIGdvdmVybm1lbnQgaGFzIGFubm91bmNlZCBhIG1ham9yIGluZnJhc3RydWN0dXJlIHNwZW5kaW5nIHBsYW4sIGJvb3N0aW5nIHNoYXJlcyBpbiBjYXBpdGFsIGdvb2RzIGFuZCBtZXRhbHMuIFRoaXMgZmlzY2FsIHN0aW11bHVzIGlzIGV4cGVjdGVkIHRvIGFjY2VsZXJhdGUgdGhlIGVjb25vbWljIHJlY292ZXJ5IGFuZCBpbmNyZWFzZSBkZW1hbmQgZm9yIGNvcnBvcmF0ZSBjcmVkaXQuIn1dLCJHcm93dGgiOlt7ImhlYWRsaW5lIjoie3ttYXJrZXR9fSBCdWxsIE1hcmtldCBSYWdlcyBvbiBhcyBDb3Jwb3JhdGUgRWFybmluZ3MgU29hciIsInN1bW1hcnkiOiJUaGUgc3RvY2sgbWFya2V0IGNvbnRpbnVlcyB0byByZWFjaCBuZXcgaGlnaHMsIGRyaXZlbiBieSBzdHJvbmcgY29ycG9yYXRlIGVhcm5pbmdzIGFuZCByb2J1c3QgZWNvbm9taWMgZ3Jvd3RoLiBJbnZlc3RvciBhcHBldGl0ZSBmb3IgcmlzayBpcyBoaWdoLCB3aXRoIHNpZ25pZmljYW50IGluZmxvd3MgaW50byBlcXVpdGllcyBhbmQgaGlnaC15aWVsZCBjb3Jwb3JhdGUgYm9uZHMuIn0seyJoZWFkbGluZSI6IkluZmxhdGlvbiBDb25jZXJucyBSaXNlIGluIHt7bWFya2V0fX0gYXMgRWNvbm9teSBPdmVyaGVhdHMiLCJzdW1tYXJ5IjoiU3Ryb25nIGVjb25vbWljIGdyb3d0aCBpcyBsZWFkaW5nIHRvIGNvbmNlcm5zIGFib3V0IHJpc2luZyBpbmZsYXRpb24sIHByb21wdGluZyB0aGUgY2VudHJhbCBiYW5rIHRvIGNvbnNpZGVyIHJhaXNpbmcgaW50ZXJlc3QgcmF0ZXMuIFRoaXMgY291bGQgbmVnYXRpdmVseSBpbXBhY3QgZ292ZXJubWVudCBib25kIHByaWNlcyBpbiB0aGUgbmVhciBmdXR1cmUuIn1dLCJQZWFrIjpbeyJoZWFkbGluZSI6IkNlbnRyYWwgQmFuayBIaWtlcyBSYXRlcyB0byBDb29sIE92ZXJoZWF0aW5nIHt7bWFya2V0fX0gRWNvbm9teSIsInN1bW1hcnkiOiJJbiBhIGJpZCB0byBjb250cm9sIGluZmxhdGlvbiwgdGhlIGNlbnRyYWwgYmFuayBoYXMgcmFpc2VkIGludGVyZXN0IHJhdGVzIGZvciB0aGUgdGhpcmQgdGltZSB0aGlzIHllYXIuIFRoZSBtb3ZlIGhhcyBjYXVzZWQgaml0dGVycyBpbiB0aGUgc3RvY2sgbWFya2V0LCB3aXRoIGFuYWx5c3RzIHdhcm5pbmcgdGhhdCB0aGUgbG9uZyBwZXJpb2Qgb2YgZ3Jvd3RoIG1heSBiZSBjb21pbmcgdG8gYW4gZW5kLiJ9LHsiaGVhZGxpbmUiOiJNYXJrZXQgVm9sYXRpbGl0eSBTcGlrZXMgaW4ge3ttYXJrZXR9fSBBbWlkc3QgRmVhcnMgb2YgYSBTbG93ZG93biIsInN1bW1hcnkiOiJBZnRlciBhIHByb2xvbmdlZCBwZXJpb2Qgb2Ygc3Ryb25nIHBlcmZvcm1hbmNlLCB0aGUgbWFya2V0IGlzIHNob3dpbmcgc2lnbnMgb2YgZmF0aWd1ZS4gQ29ycG9yYXRlIGVhcm5pbmdzIGdyb3d0aCBpcyBzbG93aW5nLCBhbmQgcmlzaW5nIGludGVyZXN0IHJhdGVzIGFyZSBtYWtpbmcgZGVidCBtb3JlIGV4cGVuc2l2ZSwgbGVhZGluZyB0byBhIHNlbGwtb2ZmIGluIHJpc2tpZXIgYXNzZXRzLiJ9XX0=";
        const templates = JSON.parse(atob(encodedTemplates));
        const cycleTemplates = templates[cycle] || templates['Growth'];
        const selected = cycleTemplates[Math.floor(Math.random() * cycleTemplates.length)];
        return `${selected.headline.replace('{{market}}', market)}\n\n${selected.summary}`;
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
            const games = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActiveGames(games);
            if (selectedGame) {
                const updatedSelectedGame = games.find(g => g.id === selectedGame.id);
                setSelectedGame(updatedSelectedGame);
            }
        });
        return () => unsubscribe();
    }, [selectedGame]);

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
            allocations: {},
            saves: {}
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
                                    {selectedGame.status === 'active' && <button onClick={handleAdvanceRound} disabled={isLoading} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold disabled:bg-gray-500">{isLoading ? 'Advancing...' : 'Advance Round'}</button>}
                                    <button onClick={() => handleDeleteGame(selectedGame.id)} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-bold">Delete Game</button>
                                </div>
                            </div>
                            <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-indigo-400">Add New Player</h3>
                                <div className="flex gap-4"><input type="text" placeholder="Player Name" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} className="flex-1 p-2 bg-gray-700 rounded-lg border border-gray-600" /><input type="text" placeholder="Create Player ID" value={newPlayerId} onChange={e => setNewPlayerId(e.target.value)} className="flex-1 p-2 bg-gray-700 rounded-lg border border-gray-600" /><button onClick={handleAddPlayer} className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold">Add Player</button></div>
                            </div>
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 text-indigo-400">Player Credentials & Status</h3>
                                <div className="bg-gray-900 p-4 rounded-lg max-h-48 overflow-y-auto">
                                    {playersArray.length > 0 ? playersArray.map(p => (
                                        <div key={p.id} className="flex justify-between items-center p-2 border-b border-gray-700">
                                            <div className="flex items-center">
                                                <span className={`w-3 h-3 rounded-full mr-3 ${p.allocations?.[`round${selectedGame.currentRound}`] ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                                <p>{p.name}</p>
                                            </div>
                                            <p className="text-gray-400">ID: <span className="font-mono text-yellow-300">{p.id}</span></p>
                                            <p className="text-gray-400">PIN: <span className="font-mono text-yellow-300">{p.pin}</span></p>
                                        </div>
                                    )) : <p className="text-gray-500 text-center">No players added yet.</p>}
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
            case 'pastReturns': return <PastReturns game={game} />;
            case 'competitors': return <ViewCompetitors game={game} players={playersArray} currentPlayerId={playerId} />;
            case 'leaderboard': return <Leaderboard players={playersArray} gameStatus={game.status} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            <div className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
                <div><h2 className="text-2xl font-bold mb-8 text-cyan-400">P-Sim</h2><nav className="space-y-4">
                    <button onClick={() => setActiveTab('portfolio')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'portfolio' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Portfolio</button>
                    <button onClick={() => setActiveTab('pastReturns')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'pastReturns' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Past Returns</button>
                    <button onClick={() => setActiveTab('competitors')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'competitors' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Competitors</button>
                    <button onClick={() => setActiveTab('leaderboard')} className={`w-full text-left px-4 py-2 rounded-lg ${activeTab === 'leaderboard' ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}>Leaderboard</button>
                </nav></div>
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
    const [savesRemaining, setSavesRemaining] = useState(3);

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

        const savesForRound = player.saves?.[`round${game.currentRound}`];
        setSavesRemaining(savesForRound === undefined ? 3 : savesForRound);

    }, [game.currentRound, game.status, game.roundSettings, player.saves]);

    useEffect(() => {
        const lastRoundAllocations = player.allocations?.[`round${game.currentRound - 1}`];
        const currentRoundAllocations = player.allocations?.[`round${game.currentRound}`];

        const initialAllocations = currentRoundAllocations || lastRoundAllocations || ALL_ASSETS.reduce((acc, asset) => ({ ...acc, [asset]: 0 }), {});
        
        setAllocations(initialAllocations);
        setTotal(Object.values(initialAllocations).reduce((sum, val) => sum + (val || 0), 0));
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
        if (savesRemaining <= 0) {
            setMessage({text: "You have no saves remaining for this round.", type: 'error'});
            return;
        }

        const newSavesRemaining = savesRemaining - 1;

        try {
            await updateDoc(doc(db, "games", game.id), {
                [`players.${playerId}.allocations.round${game.currentRound}`]: allocations,
                [`players.${playerId}.saves.round${game.currentRound}`]: newSavesRemaining
            });
            setMessage({text: `Portfolio saved successfully! You have ${newSavesRemaining} saves left.`, type: 'success'});
        } catch (error) {
            console.error("Error saving portfolio: ", error);
            setMessage({text: "Failed to save portfolio.", type: 'error'});
        }
    };
    
    const isGameFinished = game.status === 'finished';
    const canSave = savesRemaining > 0 && game.status === 'active';

    return (
        <div>
            <div className="bg-gray-800 p-6 rounded-2xl mb-8"><h2 className="text-xl font-bold text-indigo-400 mb-2">News - Round {isGameFinished ? game.settings.rounds : game.currentRound}</h2><p className="whitespace-pre-wrap">{currentNews}</p></div>
            <div className="flex justify-between items-center mb-8"><div><p className="text-gray-400">Portfolio Value</p><p className="text-4xl font-bold text-green-400">₹{player.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p></div><div className="text-right"><p className="text-gray-400">Total Allocation</p><p className={`text-4xl font-bold ${total === 100 ? 'text-green-400' : 'text-red-400'}`}>{total}%</p></div></div>
            <div className="space-y-8">{Object.entries(ASSET_CLASSES).map(([category, assets]) => (<div key={category} className="bg-gray-800 p-6 rounded-2xl"><h3 className="text-2xl font-bold capitalize mb-4 text-cyan-400">{category}</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{assets.map(asset => (<div key={asset}><label className="block mb-2 font-medium">{asset}</label><input type="number" min="0" max="100" value={allocations[asset] || 0} onChange={(e) => handleAllocationChange(asset, e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500" disabled={!canSave}/></div>))}</div></div>))}</div>
            <div className="mt-8 text-center">
                {message.text && <p className={`mb-4 text-lg ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{message.text}</p>}
                {isGameFinished && <p className="text-green-400 text-lg font-bold">The game has finished. Check the final leaderboard!</p>}
                {game.status === 'pending' && <p className="text-yellow-400 text-lg">The game has not started yet.</p>}
                {game.status === 'active' && <p className="text-lg text-gray-300 mb-4">Saves Remaining for this Round: <span className="font-bold text-yellow-400">{savesRemaining}</span></p>}
                {canSave && (<button onClick={handleSave} className="px-10 py-4 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-bold text-xl transition-colors">Save Portfolio for Round {game.currentRound}</button>)}
                {savesRemaining <= 0 && game.status === 'active' && <p className="text-green-400 text-lg">Your portfolio is locked in for Round {game.currentRound}. Waiting for the next round.</p>}
            </div>
        </div>
    );
}

// --- Past Returns Component ---
function PastReturns({ game }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (game.currentRound < 2 || !game.assetReturns) return;

        const labels = [];
        const datasets = ALL_ASSETS.map(asset => ({
            label: asset,
            data: [],
            borderColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
            tension: 0.1,
            hidden: !ASSET_CLASSES.debt.includes(asset) // Show debt by default
        }));

        for (let i = 1; i < game.currentRound; i++) {
            labels.push(`Round ${i}`);
            const roundReturns = game.assetReturns[`round${i}`];
            if (roundReturns) {
                datasets.forEach(dataset => {
                    dataset.data.push(roundReturns[dataset.label] || 0);
                });
            }
        }

        if (chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new window.Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Historical Asset Returns (%)' } },
                    scales: { y: { beginAtZero: false, title: { display: true, text: 'Return %' } } }
                }
            });
        }
    }, [game.assetReturns, game.currentRound]);

    if (game.currentRound < 2) {
        return (
            <div className="bg-gray-800 p-8 rounded-2xl">
                <h2 className="text-3xl font-bold mb-6 text-indigo-400">Past Round Returns</h2>
                <p className="text-center text-gray-400 mt-8">Past round data will be available from Round 2 onwards.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-indigo-400">Past Returns Trend</h2>
            <canvas ref={chartRef}></canvas>
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
