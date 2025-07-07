// import { useState, useCallback, useEffect } from 'react';
// import Head from 'next/head';
// import { db } from '../lib/firebase';
// import { ref, set, onValue } from 'firebase/database';

// import GameStatus from '../components/GameStatus';
// import Board from '../components/Board';
// import styles from '../styles/Game.module.css';

// // --- Constants ---
// const BOARD_SIZE = 19;
// const EMPTY = 0;
// const BLACK = 1;
// const WHITE = 2;
// const DB_GAME_ID = 'main-game'; // The path for the game in the Firebase DB
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// /**
//  * Creates a new game state object with a unique ID based on the current timestamp.
//  */
// const createInitialGameState = () => ({
//     gameId: Date.now().toString(), // A unique ID for this specific game instance
//     boardState: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
// });

// export default function GamePage() {
//     const [gameState, setGameState] = useState(null); // Starts null until loaded from Firebase
//     const [playerRole, setPlayerRole] = useState(null); // The role (1 or 2) chosen by this user
//     const [error, setError] = useState('');

//     /**
//      * EFFECT 1: This is the core synchronization logic.
//      * It runs every time the gameState from Firebase changes.
//      * It compares the local session's gameId with the server's gameId.
//      * If they don't match, it means the game was reset, and it forces a role re-selection.
//      */
//     useEffect(() => {
//         if (!gameState) return; // Do nothing until the game has loaded from Firebase

//         const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
        
//         if (savedDataJSON) {
//             const savedData = JSON.parse(savedDataJSON);
//             if (savedData.gameId === gameState.gameId) {
//                 // The IDs match. We are part of the current game.
//                 // Restore our role if it's not already set in the component's state.
//                 if (playerRole !== savedData.role) {
//                     setPlayerRole(savedData.role);
//                 }
//             } else {
//                 // The IDs DO NOT match. The game was reset by someone else.
//                 // Clear our local session and role, forcing us back to the selection screen.
//                 sessionStorage.removeItem(SESSION_STORAGE_KEY);
//                 setPlayerRole(null);
//             }
//         } else {
//             // No saved data found. We must be in the role selection state.
//             setPlayerRole(null);
//         }
//     }, [gameState]); // Dependency: Re-run this logic whenever gameState changes.

//     /**
//      * EFFECT 2: Listens for any changes to the game state in Firebase.
//      * This effect runs only once to set up the subscription.
//      */
//     useEffect(() => {
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
        
//         const unsubscribe = onValue(gameRef, (snapshot) => {
//             if (snapshot.exists()) {
//                 setGameState(snapshot.val());
//             } else {
//                 // If the game path doesn't exist in Firebase, create the first game.
//                 set(gameRef, createInitialGameState());
//             }
//         });

//         // Cleanup: Unsubscribe from the listener when the component unmounts.
//         return () => unsubscribe();
//     }, []); // Dependency: Empty array means this runs only on mount.

//     /**
//      * Saves the chosen role and the current game's ID to the browser's session storage.
//      */
//     const handleRoleSelect = (role) => {
//         if (!gameState) return; // Safety check
//         const dataToSave = {
//             role: role,
//             gameId: gameState.gameId, // Associate the role with the current game instance
//         };
//         sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//         setPlayerRole(role);
//     };

//     /**
//      * Resets the game by creating a new game state object (with a new gameId)
//      * and overwriting the old one in Firebase. The synchronization effect will
//      * handle updating all clients.
//      */
//     const resetGame = useCallback(() => {
//         const newGame = createInitialGameState();
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
//         set(gameRef, newGame);
//     }, []);
    
//     // --- Core Game Actions ---
//     // Note: A full implementation of getGroup() is required for proper capture/suicide rules.
//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
        
//         const tempBoard = gameState.boardState.map(row => [...row]);
//         tempBoard[y][x] = gameState.currentPlayer;
//         const opponent = gameState.currentPlayer === BLACK ? WHITE : BLACK;

//         const newGameState = {
//             ...gameState,
//             boardState: tempBoard,
//             currentPlayer: opponent,
//             passCount: 0,
//         };
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);
//     }, [gameState, playerRole]);
    
//     const handlePass = useCallback(() => {
//         if (!isMyTurn || !gameState) return;
//         const newPassCount = gameState.passCount + 1;
//         if (newPassCount >= 2) {
//             set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: "Game ended by two consecutive passes." });
//         } else {
//             set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, passCount: newPassCount, currentPlayer: gameState.currentPlayer === BLACK ? WHITE : BLACK });
//         }
//     }, [gameState, playerRole]);

//     const handleResign = useCallback(() => {
//         if (!isMyTurn || !gameState) return;
//         const winner = gameState.currentPlayer === BLACK ? "White" : "Black";
//         set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: `${winner} wins by resignation.` });
//     }, [gameState, playerRole]);

//     // --- Render Logic ---
//     if (!gameState) {
//         return <div className={styles.pageContainer}>Connecting to game server...</div>;
//     }
    
//     const isMyTurn = !gameState.gameOver && playerRole === gameState.currentPlayer;

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Synchronized</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>

//                 {!playerRole ? (
//                     // --- ROLE SELECTION UI ---
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Choose Your Color</h2>
//                         <p>Select which player you want to be. Another player can choose the other color.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => handleRoleSelect(BLACK)} className={styles.roleButton}>Play as Black</button>
//                             <button onClick={() => handleRoleSelect(WHITE)} className={styles.roleButton}>Play as White</button>
//                         </div>
//                          <button onClick={resetGame} className={`${styles.gameButton} ${styles.resetButton}`}>Reset Server Game</button>
//                     </div>
//                 ) : (
//                     // --- MAIN GAME UI ---
//                     <>
//                         <div className={styles.playerInfo}>
//                             You are playing as: <strong>{playerRole === BLACK ? 'Black' : 'White'}</strong>
//                         </div>
//                         <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
//                         <div className={styles.boardWrapper}>
//                             <Board boardState={gameState.boardState} onBoardClick={placeStone} isMyTurn={isMyTurn} />
//                         </div>
//                         <div className={styles.controls}>
//                             <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
//                             <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
//                             <button onClick={resetGame} className={styles.gameButton}>Reset Game</button>
//                         </div>
//                     </>
//                 )}
//             </div>

//             {gameState.gameOver && playerRole && (
//                 <div className={styles.gameOverModal}>
//                     <div className={styles.gameOverContent}>
//                         <h2>{gameState.gameOverMessage}</h2>
//                         <button onClick={resetGame} className={styles.gameButton}>New Game</button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }



















// import { useState, useCallback, useEffect } from 'react';
// import Head from 'next/head';
// import { db } from '../lib/firebase';
// import { ref, set, onValue } from 'firebase/database';

// import GameStatus from '../components/GameStatus';
// import Board from '../components/Board';
// import styles from '../styles/Game.module.css';

// // --- Constants ---
// const BOARD_SIZE = 19;
// const EMPTY = 0;
// const BLACK = 1;
// const WHITE = 2;
// const DB_GAME_ID = 'main-game';
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// /**
//  * Creates a new game state object with a unique ID and a move history.
//  */
// const createInitialGameState = () => ({
//     gameId: Date.now().toString(),
//     boardState: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
//     history: [JSON.stringify(Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)))], // RE-INTEGRATED: History for Ko rule
// });

// export default function GamePage() {
//     const [gameState, setGameState] = useState(null);
//     const [playerRole, setPlayerRole] = useState(null);
//     const [error, setError] = useState('');

//     useEffect(() => {
//         if (!gameState) return;
//         const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
//         if (savedDataJSON) {
//             const savedData = JSON.parse(savedDataJSON);
//             if (savedData.gameId === gameState.gameId) {
//                 if (playerRole !== savedData.role) setPlayerRole(savedData.role);
//             } else {
//                 sessionStorage.removeItem(SESSION_STORAGE_KEY);
//                 setPlayerRole(null);
//             }
//         } else {
//             setPlayerRole(null);
//         }
//     }, [gameState]);

//     useEffect(() => {
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
//         const unsubscribe = onValue(gameRef, (snapshot) => {
//             if (snapshot.exists()) {
//                 setGameState(snapshot.val());
//             } else {
//                 set(gameRef, createInitialGameState());
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     const handleRoleSelect = (role) => {
//         if (!gameState) return;
//         const dataToSave = { role: role, gameId: gameState.gameId };
//         sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//         setPlayerRole(role);
//     };

//     const resetGame = useCallback(() => {
//         set(ref(db, `games/${DB_GAME_ID}`), createInitialGameState());
//     }, []);

//     // --- RE-INTEGRATED: Full Game Logic ---

//     /**
//      * Finds all connected stones of the same color and their liberties.
//      */
//     const getGroup = useCallback((startX, startY, board, player) => {
//         const groupStones = [];
//         const libertySet = new Set();
//         const visited = new Set();
//         const queue = [{ x: startX, y: startY }];
//         visited.add(`${startX},${startY}`);

//         while (queue.length > 0) {
//             const { x, y } = queue.shift();
//             groupStones.push({ x, y });
//             const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
//             for (const { dx, dy } of neighbors) {
//                 const nx = x + dx;
//                 const ny = y + dy;
//                 if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
//                 const neighborKey = `${nx},${ny}`;
//                 if (visited.has(neighborKey)) continue;
//                 if (board[ny][nx] === EMPTY) {
//                     libertySet.add(neighborKey);
//                 } else if (board[ny][nx] === player) {
//                     visited.add(neighborKey);
//                     queue.push({ x: nx, y: ny });
//                 }
//             }
//         }
//         return { stones: groupStones, liberties: libertySet.size };
//     }, []);

//     /**
//      * This is the fully restored placeStone function with all rule checks.
//      */
//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;

//         const tempBoard = gameState.boardState.map(row => [...row]);
//         tempBoard[y][x] = gameState.currentPlayer;
//         const opponent = gameState.currentPlayer === BLACK ? WHITE : BLACK;

//         // 1. Check for captures
//         let capturedStonesList = [];
//         const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
//         for (const { dx, dy } of neighbors) {
//             const nx = x + dx;
//             const ny = y + dy;
//             if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || tempBoard[ny][nx] !== opponent) continue;
            
//             const group = getGroup(nx, ny, tempBoard, opponent);
//             if (group.liberties === 0) {
//                 capturedStonesList.push(...group.stones);
//             }
//         }
        
//         // Remove captured stones from the board
//         for (const stone of capturedStonesList) {
//             tempBoard[stone.y][stone.x] = EMPTY;
//         }

//         // 2. Check for suicide
//         const ownGroup = getGroup(x, y, tempBoard, gameState.currentPlayer);
//         if (ownGroup.liberties === 0) {
//              setError("Invalid move: Suicide is not allowed.");
//              return; // Move is illegal
//         }

//         // 3. Check for Ko (repeated board state)
//         const nextStateStr = JSON.stringify(tempBoard);
//         if (gameState.history && gameState.history.includes(nextStateStr)) {
//             setError("Invalid move: This position is a Ko.");
//             return; // Move is illegal
//         }
        
//         // If all checks pass, create the new state
//         const newHistory = [...(gameState.history || []), nextStateStr];
//         const newCaptures = { ...gameState.captures };
//         newCaptures[gameState.currentPlayer] += capturedStonesList.length;

//         const newGameState = {
//             ...gameState,
//             boardState: tempBoard,
//             currentPlayer: opponent,
//             captures: newCaptures,
//             passCount: 0,
//             history: newHistory,
//         };
        
//         setError(''); // Clear any previous errors
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);

//     }, [gameState, playerRole, getGroup]);
    
//     // --- The rest of the file is largely unchanged ---
    
//     const handlePass = useCallback(() => {
//     if (!isMyTurn || !gameState) return;
//     const newPassCount = gameState.passCount + 1;
//     if (newPassCount >= 2) {
//         set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: "Game ended by two consecutive passes." });
//     } else {
//         set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, passCount: newPassCount, currentPlayer: gameState.currentPlayer === BLACK ? WHITE : BLACK });
//     }
//     }, [gameState, playerRole]);

//     const handleResign = useCallback(() => {
//         if (!isMyTurn || !gameState) return;
//         const winner = gameState.currentPlayer === BLACK ? "White" : "Black";
//         set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: `${winner} wins by resignation.` });
//     }, [gameState, playerRole]);



//     if (!gameState) {
//         return <div className={styles.pageContainer}>Connecting to game server...</div>;
//     }
    
//     const isMyTurn = !gameState.gameOver && playerRole === gameState.currentPlayer;

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Full Logic</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>
//                 {error && <div className={styles.errorMessage}>{error}</div>}
//                 {!playerRole ? (
//                      <div className={styles.roleSelectionContainer}>
//                         <h2>Choose Your Color</h2>
//                         <p>Select which player you want to be. Another player can choose the other color.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => handleRoleSelect(BLACK)} className={styles.roleButton}>Play as Black</button>
//                             <button onClick={() => handleRoleSelect(WHITE)} className={styles.roleButton}>Play as White</button>
//                         </div>
//                          <button onClick={resetGame} className={`${styles.gameButton} ${styles.resetButton}`}>Reset Server Game</button>
//                     </div>
//                 ) : (
//                     <>
//                         <div className={styles.playerInfo}>
//                             You are playing as: <strong>{playerRole === BLACK ? 'Black' : 'White'}</strong>
//                         </div>
//                         <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
//                         <div className={styles.boardWrapper}>
//                             <Board boardState={gameState.boardState} onBoardClick={placeStone} isMyTurn={isMyTurn} />
//                         </div>
//                         <div className={styles.controls}>
//                             <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
//                             <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
//                             <button onClick={resetGame} className={styles.gameButton}>Reset Game</button>
//                         </div>
//                     </>
//                 )}
//             </div>
//             {gameState.gameOver && playerRole && (
//                 <div className={styles.gameOverModal}>
//                     <div className={styles.gameOverContent}>
//                         <h2>{gameState.gameOverMessage}</h2>
//                         <button onClick={resetGame} className={styles.gameButton}>New Game</button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }










// /pages/game.js

import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import { db } from '../lib/firebase';
import { ref, set, onValue } from 'firebase/database';

import GameStatus from '../components/GameStatus';
import Board from '../components/Board';
import styles from '../styles/Game.module.css';

// --- Constants ---
const BOARD_SIZE = 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const DB_GAME_ID = 'main-game';
const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

const createInitialGameState = () => ({
    gameId: Date.now().toString(),
    boardState: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)),
    currentPlayer: BLACK,
    captures: { [BLACK]: 0, [WHITE]: 0 },
    passCount: 0,
    gameOver: false,
    gameOverMessage: '',
    history: [JSON.stringify(Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)))],
});

export default function GamePage() {
    const [gameState, setGameState] = useState(null);
    const [playerRole, setPlayerRole] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!gameState) return;
        const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedDataJSON) {
            const savedData = JSON.parse(savedDataJSON);
            if (savedData.gameId === gameState.gameId) {
                if (playerRole !== savedData.role) setPlayerRole(savedData.role);
            } else {
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
                setPlayerRole(null);
            }
        } else {
            setPlayerRole(null);
        }
    }, [gameState]);

    useEffect(() => {
        const gameRef = ref(db, `games/${DB_GAME_ID}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                setGameState(snapshot.val());
            } else {
                set(gameRef, createInitialGameState());
            }
        });
        return () => unsubscribe();
    }, []);

    const handleRoleSelect = (role) => {
        if (!gameState) return;
        const dataToSave = { role: role, gameId: gameState.gameId };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
        setPlayerRole(role);
    };

    const resetGame = useCallback(() => {
        set(ref(db, `games/${DB_GAME_ID}`), createInitialGameState());
    }, []);

    const getGroup = useCallback((startX, startY, board, player) => {
        const groupStones = [];
        const libertySet = new Set();
        const visited = new Set();
        const queue = [{ x: startX, y: startY }];
        visited.add(`${startX},${startY}`);
        while (queue.length > 0) {
            const { x, y } = queue.shift();
            groupStones.push({ x, y });
            const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
            for (const { dx, dy } of neighbors) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) continue;
                const neighborKey = `${nx},${ny}`;
                if (visited.has(neighborKey)) continue;
                if (board[ny][nx] === EMPTY) {
                    libertySet.add(neighborKey);
                } else if (board[ny][nx] === player) {
                    visited.add(neighborKey);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
        return { stones: groupStones, liberties: libertySet.size };
    }, []);

    const placeStone = useCallback((x, y) => {
        if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
        const tempBoard = gameState.boardState.map(row => [...row]);
        tempBoard[y][x] = gameState.currentPlayer;
        const opponent = gameState.currentPlayer === BLACK ? WHITE : BLACK;
        let capturedStonesList = [];
        const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
        for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE || tempBoard[ny][nx] !== opponent) continue;
            const group = getGroup(nx, ny, tempBoard, opponent);
            if (group.liberties === 0) {
                capturedStonesList.push(...group.stones);
            }
        }
        for (const stone of capturedStonesList) {
            tempBoard[stone.y][stone.x] = EMPTY;
        }
        const ownGroup = getGroup(x, y, tempBoard, gameState.currentPlayer);
        if (ownGroup.liberties === 0) return;
        const nextStateStr = JSON.stringify(tempBoard);
        if (gameState.history && gameState.history.includes(nextStateStr)) return;
        const newHistory = [...(gameState.history || []), nextStateStr];
        const newCaptures = { ...gameState.captures };
        newCaptures[gameState.currentPlayer] += capturedStonesList.length;
        const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
        set(ref(db, `games/${DB_GAME_ID}`), newGameState);
    }, [gameState, playerRole, getGroup]);

    const handlePass = useCallback(() => {
    if (!isMyTurn || !gameState) return;
    const newPassCount = gameState.passCount + 1;
    if (newPassCount >= 2) {
        set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: "Game ended by two consecutive passes." });
    } else {
        set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, passCount: newPassCount, currentPlayer: gameState.currentPlayer === BLACK ? WHITE : BLACK });
    }
    }, [gameState, playerRole]);

    const handleResign = useCallback(() => {
        if (!isMyTurn || !gameState) return;
        const winner = gameState.currentPlayer === BLACK ? "White" : "Black";
        set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: `${winner} wins by resignation.` });
    }, [gameState, playerRole]);

    if (!gameState) {
        return <div className={styles.pageContainer}>Connecting to game server...</div>;
    }
    
    const isMyTurn = !gameState.gameOver && playerRole === gameState.currentPlayer;

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Go (Baduk) Game - Synchronized</title>
            </Head>
            <div className={styles.gameContainer}>
                <h1>Go (Baduk)</h1>
                {error && <div className={styles.errorMessage}>{error}</div>}
                
                {!playerRole ? (
                    // --- ROLE SELECTION UI (MODIFIED) ---
                    <div className={styles.roleSelectionContainer}>
                        <h2>Choose Your Color</h2>
                        <p>Select which player you want to be. Another player can choose the other color.</p>
                        <div className={styles.controls}>
                            <button onClick={() => handleRoleSelect(BLACK)} className={styles.roleButton}>Play as Black</button>
                            <button onClick={() => handleRoleSelect(WHITE)} className={styles.roleButton}>Play as White</button>
                        </div>
                       
                    </div>
                ) : (
                    // --- MAIN GAME UI ---
                    <>
                        <div className={styles.playerInfo}>
                            You are playing as: <strong>{playerRole === BLACK ? 'Black' : 'White'}</strong>
                        </div>
                        <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
                        <div className={styles.boardWrapper}>
                            <Board boardState={gameState.boardState} onBoardClick={placeStone} isMyTurn={isMyTurn} />
                        </div>
                        <div className={styles.controls}>
                            <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
                            <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
                            <button onClick={resetGame} className={styles.gameButton}>Reset Game</button>
                        </div>
                    </>
                )}
            </div>

            {gameState.gameOver && playerRole && (
                <div className={styles.gameOverModal}>
                    <div className={styles.gameOverContent}>
                        <h2>{gameState.gameOverMessage}</h2>
                        <button onClick={resetGame} className={styles.gameButton}>New Game</button>
                    </div>
                </div>
            )}
        </div>
    );
}