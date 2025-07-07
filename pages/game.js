


// // /pages/game.js

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
// const BOTH = 3; // NEW: A constant for the "Play Both Sides" role
// const DB_GAME_ID = 'main-game';
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// const createInitialGameState = () => ({
//     gameId: Date.now().toString(),
//     boardState: Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
//     history: [JSON.stringify(Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY)))],
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

//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
//         const tempBoard = gameState.boardState.map(row => [...row]);
//         tempBoard[y][x] = gameState.currentPlayer;
//         const opponent = gameState.currentPlayer === BLACK ? WHITE : BLACK;
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
//         for (const stone of capturedStonesList) {
//             tempBoard[stone.y][stone.x] = EMPTY;
//         }
//         const ownGroup = getGroup(x, y, tempBoard, gameState.currentPlayer);
//         if (ownGroup.liberties === 0) return;
//         const nextStateStr = JSON.stringify(tempBoard);
//         if (gameState.history && gameState.history.includes(nextStateStr)) return;
//         const newHistory = [...(gameState.history || []), nextStateStr];
//         const newCaptures = { ...gameState.captures };
//         newCaptures[gameState.currentPlayer] += capturedStonesList.length;
//         const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);
//     }, [gameState, playerRole, getGroup]);

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
    
//     // MODIFIED: The core logic change. It's your turn if you are playing both sides OR your role matches the current player.
//     const isMyTurn = !gameState.gameOver && (playerRole === BOTH || playerRole === gameState.currentPlayer);

//     // NEW: Helper function to get the display name for the role.
//     const getRoleName = (role) => {
//         if (role === BLACK) return "Black";
//         if (role === WHITE) return "White";
//         if (role === BOTH) return "Both Sides (Local Play)";
//         return "Spectator";
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Synchronized</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>
//                 {error && <div className={styles.errorMessage}>{error}</div>}
                
//                 {!playerRole ? (
//                     // --- ROLE SELECTION UI (MODIFIED) ---
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Choose Your Mode</h2>
//                         <p>Select a color to play online against another player, or choose "Play Both Sides" for a local game on this device.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => handleRoleSelect(BLACK)} className={styles.roleButton}>Play as Black</button>
//                             <button onClick={() => handleRoleSelect(WHITE)} className={styles.roleButton}>Play as White</button>
//                             {/* NEW: The third button for local play */}
//                             <button onClick={() => handleRoleSelect(BOTH)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Play Both Sides</button>
//                         </div>
//                     </div>
//                 ) : (
//                     // --- MAIN GAME UI ---
//                     <>
//                         <div className={styles.playerInfo}>
//                             {/* MODIFIED: Use the helper function for display text */}
//                             You are playing as: <strong>{getRoleName(playerRole)}</strong>
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








































// // /pages/game.js

// import { useState, useCallback, useEffect } from 'react';
// import Head from 'next/head';
// import { db } from '../lib/firebase';
// import { ref, set, onValue } from 'firebase/database';

// import GameStatus from '../components/GameStatus';
// import Board from '../components/Board';
// import styles from '../styles/Game.module.css';

// // --- Constants ---
// const EMPTY = 0;
// const BLACK = 1;
// const WHITE = 2;
// const BOTH = 3;
// const DB_GAME_ID = 'main-game';
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// /**
//  * Creates a new game state object with a dynamic size.
//  */
// const createInitialGameState = (size = 19) => ({
//     gameId: Date.now().toString(),
//     boardSize: size, // The board size is now part of the game state
//     boardState: Array(size).fill(0).map(() => Array(size).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
//     history: [JSON.stringify(Array(size).fill(0).map(() => Array(size).fill(EMPTY)))],
// });

// export default function GamePage() {
//     const [gameState, setGameState] = useState(null);
//     const [playerRole, setPlayerRole] = useState(null);
//     const [error, setError] = useState('');
//     const [boardSizeInput, setBoardSizeInput] = useState(19); // State for the size input field

//     // Synchronization effect to align local session with server state
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

//     // Effect to listen to Firebase for game state updates
//     useEffect(() => {
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
//         const unsubscribe = onValue(gameRef, (snapshot) => {
//             if (snapshot.exists()) {
//                 setGameState(snapshot.val());
//             } else {
//                 set(gameRef, createInitialGameState(19));
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     /**
//      * Starts a brand new game on the server with the selected settings,
//      * then assigns the role to the current user.
//      */
//     const startNewGame = (role, size) => {
//         const newGame = createInitialGameState(size);
//         set(ref(db, `games/${DB_GAME_ID}`), newGame).then(() => {
//             const dataToSave = { role: role, gameId: newGame.gameId };
//             sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//             setPlayerRole(role);
//         });
//     };
    
//     /**
//      * Allows a player to leave their role and return to the selection screen
//      * without resetting the game for everyone.
//      */
//     const returnToRoleSelection = useCallback(() => {
//         sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         setPlayerRole(null);
//     }, []);

//     // --- Core Game Logic ---
//     const getGroup = useCallback((startX, startY, board, player) => {
//         if (!gameState) return { stones: [], liberties: 0 };
//         const size = gameState.boardSize;
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
//                 if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
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
//     }, [gameState]);

//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
        
//         const { boardState, currentPlayer, history, boardSize } = gameState;
        
//         const tempBoard = boardState.map(row => [...row]);
//         tempBoard[y][x] = currentPlayer;
//         const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        
//         let capturedStonesList = [];
//         const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
//         for (const { dx, dy } of neighbors) {
//             const nx = x + dx;
//             const ny = y + dy;
//             if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || tempBoard[ny][nx] !== opponent) continue;
//             const group = getGroup(nx, ny, tempBoard, opponent);
//             if (group.liberties === 0) {
//                 capturedStonesList.push(...group.stones);
//             }
//         }
        
//         for (const stone of capturedStonesList) {
//             tempBoard[stone.y][stone.x] = EMPTY;
//         }
        
//         const ownGroup = getGroup(x, y, tempBoard, currentPlayer);
//         if (ownGroup.liberties === 0) return;
        
//         const nextStateStr = JSON.stringify(tempBoard);
//         if (history && history.includes(nextStateStr)) return;
        
//         const newHistory = [...(history || []), nextStateStr];
//         const newCaptures = { ...gameState.captures };
//         newCaptures[currentPlayer] += capturedStonesList.length;
        
//         const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);
//     }, [gameState, playerRole, getGroup]);

//     const handlePass = useCallback(() => { /* ... Unchanged ... */ }, [gameState, playerRole]);
//     const handleResign = useCallback(() => { /* ... Unchanged ... */ }, [gameState, playerRole]);

//     if (!gameState) {
//         return <div className={styles.pageContainer}>Connecting to game server...</div>;
//     }

//     const isMyTurn = !gameState.gameOver && (playerRole === BOTH || playerRole === gameState.currentPlayer);
//     const getRoleName = (role) => {
//         if (role === BLACK) return "Black";
//         if (role === WHITE) return "White";
//         if (role === BOTH) return "Both Sides (Local Play)";
//         return "Spectator";
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Custom Size</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>
//                 {error && <div className={styles.errorMessage}>{error}</div>}
                
//                 {!playerRole ? (
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Start a New Game</h2>
//                         <div className={styles.sizeInputContainer}>
//                             <label htmlFor="board-size">Board Size:</label>
//                             <input
//                                 id="board-size"
//                                 type="number"
//                                 value={boardSizeInput}
//                                 onChange={(e) => setBoardSizeInput(Math.max(5, Math.min(19, parseInt(e.target.value, 10) || 19)))}
//                                 min="5"
//                                 max="19"
//                                 step="2" // Encourage standard odd-numbered sizes
//                             />
//                         </div>
//                         <p>Select a mode to start a new game with the chosen settings. This will overwrite any game in progress on the server.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => startNewGame(BLACK, boardSizeInput)} className={styles.roleButton}>Play as Black</button>
//                             <button onClick={() => startNewGame(WHITE, boardSizeInput)} className={styles.roleButton}>Play as White</button>
//                             <button onClick={() => startNewGame(BOTH, boardSizeInput)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Play Both Sides</button>
//                         </div>
//                     </div>
//                 ) : (
//                     <>
//                         <div className={styles.playerInfo}>
//                             Playing as: <strong>{getRoleName(playerRole)}</strong> on a <strong>{gameState.boardSize}x{gameState.boardSize}</strong> board.
//                         </div>
//                         <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
//                         <div className={styles.boardWrapper}>
//                             <Board
//                                 boardState={gameState.boardState}
//                                 boardSize={gameState.boardSize}
//                                 onBoardClick={placeStone}
//                                 isMyTurn={isMyTurn}
//                             />
//                         </div>
//                         <div className={styles.controls}>
//                             <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
//                             <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
//                             <button onClick={returnToRoleSelection} className={styles.gameButton}>Change Mode</button>
//                         </div>
//                     </>
//                 )}
//             </div>

//             {gameState.gameOver && playerRole && (
//                 <div className={styles.gameOverModal}>
//                     <div className={styles.gameOverContent}>
//                         <h2>{gameState.gameOverMessage}</h2>
//                         <button onClick={() => startNewGame(playerRole, gameState.boardSize)} className={styles.gameButton}>New Game</button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }





















// // /pages/game.js

// import { useState, useCallback, useEffect } from 'react';
// import Head from 'next/head';
// import { db } from '../lib/firebase';
// import { ref, set, onValue } from 'firebase/database';

// import GameStatus from '../components/GameStatus';
// import Board from '../components/Board';
// import styles from '../styles/Game.module.css';

// // --- Constants ---
// const EMPTY = 0;
// const BLACK = 1;
// const WHITE = 2;
// const BOTH = 3;
// const DB_GAME_ID = 'main-game';
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// /**
//  * Creates a new game state object with a dynamic size and a game mode.
//  */
// const createInitialGameState = (size = 19, mode = 'online') => ({
//     gameId: Date.now().toString(),
//     gameMode: mode, // 'online' or 'local'
//     boardSize: size,
//     boardState: Array(size).fill(0).map(() => Array(size).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
//     history: [JSON.stringify(Array(size).fill(0).map(() => Array(size).fill(EMPTY)))],
// });

// export default function GamePage() {
//     const [gameState, setGameState] = useState(null);
//     const [playerRole, setPlayerRole] = useState(null);
//     const [uiView, setUiView] = useState('loading'); // 'loading', 'modeSelect', 'colorSelect', 'gameBoard'
//     const [boardSizeInput, setBoardSizeInput] = useState(19);

//     // --- Synchronization and Setup Effects ---
//     useEffect(() => {
//         if (!gameState) return;
//         const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
//         if (savedDataJSON) {
//             const savedData = JSON.parse(savedDataJSON);
//             if (savedData.gameId === gameState.gameId) {
//                 // We have a role in the current game.
//                 setPlayerRole(savedData.role);
//                 setUiView('gameBoard');
//                 return;
//             }
//         }
//         // If we reach here, we don't have a valid role for the current game.
//         sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         setPlayerRole(null);
//         if (gameState.gameMode === 'online') {
//             setUiView('colorSelect');
//         } else {
//             setUiView('modeSelect');
//         }
//     }, [gameState]);

//     useEffect(() => {
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
//         const unsubscribe = onValue(gameRef, (snapshot) => {
//             if (snapshot.exists()) {
//                 setGameState(snapshot.val());
//             } else {
//                 set(gameRef, createInitialGameState(19, 'modeSelect'));
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     // --- User Actions ---
//     const startNewGame = (mode, role, size) => {
//         const newGame = createInitialGameState(size, mode);
//         set(ref(db, `games/${DB_GAME_ID}`), newGame).then(() => {
//             if (role) {
//                 const dataToSave = { role, gameId: newGame.gameId };
//                 sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//                 setPlayerRole(role);
//             }
//         });
//     };

//     const handleColorSelect = (role) => {
//         if (!gameState) return;
//         const dataToSave = { role, gameId: gameState.gameId };
//         sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//         setPlayerRole(role);
//         setUiView('gameBoard');
//     };

//     const returnToModeSelection = useCallback(() => {
//         sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         setPlayerRole(null);
//         setUiView('modeSelect');
//     }, []);

//     // --- Core Game Logic (Unchanged) ---
//    const getGroup = useCallback((startX, startY, board, player) => {
//         if (!gameState) return { stones: [], liberties: 0 };
//         const size = gameState.boardSize;
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
//                 if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
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
//     }, [gameState]);

//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
        
//         const { boardState, currentPlayer, history, boardSize } = gameState;
        
//         const tempBoard = boardState.map(row => [...row]);
//         tempBoard[y][x] = currentPlayer;
//         const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        
//         let capturedStonesList = [];
//         const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
//         for (const { dx, dy } of neighbors) {
//             const nx = x + dx;
//             const ny = y + dy;
//             if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || tempBoard[ny][nx] !== opponent) continue;
//             const group = getGroup(nx, ny, tempBoard, opponent);
//             if (group.liberties === 0) {
//                 capturedStonesList.push(...group.stones);
//             }
//         }
        
//         for (const stone of capturedStonesList) {
//             tempBoard[stone.y][stone.x] = EMPTY;
//         }
        
//         const ownGroup = getGroup(x, y, tempBoard, currentPlayer);
//         if (ownGroup.liberties === 0) return;
        
//         const nextStateStr = JSON.stringify(tempBoard);
//         if (history && history.includes(nextStateStr)) return;
        
//         const newHistory = [...(history || []), nextStateStr];
//         const newCaptures = { ...gameState.captures };
//         newCaptures[currentPlayer] += capturedStonesList.length;
        
//         const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);
//     }, [gameState, playerRole, getGroup]);

//         const handlePass = useCallback(() => {
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



//     // --- Render Logic ---
//     const renderContent = () => {
//         switch (uiView) {
//             case 'loading':
//                 return <div className={styles.pageContainer}>Connecting to game server...</div>;
            
//             case 'modeSelect':
//                 return (
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Start a New Game</h2>
//                         <div className={styles.sizeInputContainer}>
//                             <label htmlFor="board-size">Board Size:</label>
//                             <input
//                                 id="board-size"
//                                 type="number"
//                                 value={boardSizeInput}
//                                 onChange={(e) => setBoardSizeInput(Math.max(5, Math.min(19, parseInt(e.target.value, 10) || 19)))}
//                                 min="5" max="19" step="2"
//                             />
//                         </div>
//                         <p>This will start a new game for everyone, overwriting any game in progress.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => startNewGame('online', null, boardSizeInput)} className={styles.roleButton}>Play Online</button>
//                             <button onClick={() => startNewGame('local', BOTH, boardSizeInput)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Play Both Sides (Local)</button>
//                         </div>
//                     </div>
//                 );

//             case 'colorSelect':
//                 return (
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Online Game ({gameState?.boardSize}x{gameState?.boardSize})</h2>
//                         <p>A new online game has started. Choose your color to join.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => handleColorSelect(BLACK)} className={styles.roleButton}>Join as Black</button>
//                             <button onClick={() => handleColorSelect(WHITE)} className={styles.roleButton}>Join as White</button>
//                         </div>
//                         <button onClick={returnToModeSelection} className={`${styles.gameButton} ${styles.resetButton}`}>Back to Main Menu</button>
//                     </div>
//                 );

//             case 'gameBoard':
//                 const isMyTurn = !gameState.gameOver && (playerRole === BOTH || playerRole === gameState.currentPlayer);
//                 const getRoleName = (role) => {
//                     if (role === BLACK) return "Black";
//                     if (role === WHITE) return "White";
//                     if (role === BOTH) return "Both Sides (Local Play)";
//                     return "Spectator";
//                 };

//                 return (
//                     <>
//                         <div className={styles.playerInfo}>
//                             Playing as: <strong>{getRoleName(playerRole)}</strong> on a <strong>{gameState.boardSize}x{gameState.boardSize}</strong> board.
//                         </div>
//                         <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
//                         <div className={styles.boardWrapper}>
//                             <Board
//                                 boardState={gameState.boardState}
//                                 boardSize={gameState.boardSize}
//                                 onBoardClick={placeStone}
//                                 isMyTurn={isMyTurn}
//                             />
//                         </div>
//                         <div className={styles.controls}>
//                             <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
//                             <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
//                             <button onClick={returnToModeSelection} className={styles.gameButton}>Exit Game</button>
//                         </div>
//                         {gameState.gameOver && (
//                             <div className={styles.gameOverModal}>
//                                 <div className={styles.gameOverContent}>
//                                     <h2>{gameState.gameOverMessage}</h2>
//                                     <button onClick={returnToModeSelection} className={styles.gameButton}>Back to Menu</button>
//                                 </div>
//                             </div>
//                         )}
//                     </>
//                 );

//             default:
//                 return <div className={styles.pageContainer}>An unexpected error occurred.</div>;
//         }
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Multiplayer</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>
//                 {renderContent()}
//             </div>
//         </div>
//     );
// }

// // NOTE: Remember to copy the full game logic functions (getGroup, placeStone, etc.) from the previous complete example.
// // They are omitted here for brevity but are required.





























// // /pages/game.js

// import { useState, useCallback, useEffect } from 'react';
// import Head from 'next/head';
// import { db } from '../lib/firebase';
// import { ref, set, onValue } from 'firebase/database';

// import GameStatus from '../components/GameStatus';
// import Board from '../components/Board';
// import styles from '../styles/Game.module.css';

// // --- Constants ---
// const EMPTY = 0;
// const BLACK = 1;
// const WHITE = 2;
// const BOTH = 3;
// const DB_GAME_ID = 'main-game';
// const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

// const createInitialGameState = (size = 19, mode = 'online') => ({
//     gameId: Date.now().toString(),
//     gameMode: mode,
//     boardSize: size,
//     boardState: Array(size).fill(0).map(() => Array(size).fill(EMPTY)),
//     currentPlayer: BLACK,
//     captures: { [BLACK]: 0, [WHITE]: 0 },
//     passCount: 0,
//     gameOver: false,
//     gameOverMessage: '',
//     history: [JSON.stringify(Array(size).fill(0).map(() => Array(size).fill(EMPTY)))],
// });

// export default function GamePage() {
//     const [gameState, setGameState] = useState(null);
//     const [playerRole, setPlayerRole] = useState(null);
//     const [uiView, setUiView] = useState('loading');
//     const [boardSizeInput, setBoardSizeInput] = useState(19);

//     // --- Synchronization and Setup Effects ---
//     useEffect(() => {
//         if (!gameState) return;
//         const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
//         if (savedDataJSON) {
//             const savedData = JSON.parse(savedDataJSON);
//             if (savedData.gameId === gameState.gameId) {
//                 setPlayerRole(savedData.role);
//                 setUiView('gameBoard');
//                 return;
//             }
//         }
//         sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         setPlayerRole(null);
//         if (gameState.gameMode === 'online') {
//             setUiView('colorSelect');
//         } else {
//             setUiView('modeSelect');
//         }
//     }, [gameState]);

//     useEffect(() => {
//         const gameRef = ref(db, `games/${DB_GAME_ID}`);
//         const unsubscribe = onValue(gameRef, (snapshot) => {
//             if (snapshot.exists()) {
//                 setGameState(snapshot.val());
//             } else {
//                 set(gameRef, createInitialGameState(19, 'modeSelect'));
//             }
//         });
//         return () => unsubscribe();
//     }, []);

//     // --- User Actions ---
//     const startNewGame = (mode, role, size) => {
//         const newGame = createInitialGameState(size, mode);
//         set(ref(db, `games/${DB_GAME_ID}`), newGame).then(() => {
//             if (role) {
//                 const dataToSave = { role, gameId: newGame.gameId };
//                 sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//                 setPlayerRole(role);
//             }
//         });
//     };

//     const handleColorSelect = (role) => {
//         if (!gameState) return;
//         const dataToSave = { role, gameId: gameState.gameId };
//         sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
//         setPlayerRole(role);
//         setUiView('gameBoard');
//     };

//     const returnToModeSelection = useCallback(() => {
//         sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         setPlayerRole(null);
//         setUiView('modeSelect');
//     }, []);

//     // --- THE FIX: isMyTurn is now declared in the main component scope ---
//     const isMyTurn = gameState && !gameState.gameOver && (playerRole === BOTH || playerRole === gameState.currentPlayer);

//     // --- Core Game Logic ---
//     const getGroup = useCallback((startX, startY, board, player) => {
//         if (!gameState) return { stones: [], liberties: 0 };
//         const size = gameState.boardSize;
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
//                 if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
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
//     }, [gameState]);

//     const placeStone = useCallback((x, y) => {
//         if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
//         const { boardState, currentPlayer, history, boardSize } = gameState;
//         const tempBoard = boardState.map(row => [...row]);
//         tempBoard[y][x] = currentPlayer;
//         const opponent = currentPlayer === BLACK ? WHITE : BLACK;
//         let capturedStonesList = [];
//         const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
//         for (const { dx, dy } of neighbors) {
//             const nx = x + dx;
//             const ny = y + dy;
//             if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || tempBoard[ny][nx] !== opponent) continue;
//             const group = getGroup(nx, ny, tempBoard, opponent);
//             if (group.liberties === 0) {
//                 capturedStonesList.push(...group.stones);
//             }
//         }
//         for (const stone of capturedStonesList) {
//             tempBoard[stone.y][stone.x] = EMPTY;
//         }
//         const ownGroup = getGroup(x, y, tempBoard, currentPlayer);
//         if (ownGroup.liberties === 0) return;
//         const nextStateStr = JSON.stringify(tempBoard);
//         if (history && history.includes(nextStateStr)) return;
//         const newHistory = [...(history || []), nextStateStr];
//         const newCaptures = { ...gameState.captures };
//         newCaptures[currentPlayer] += capturedStonesList.length;
//         const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
//         set(ref(db, `games/${DB_GAME_ID}`), newGameState);
//     }, [gameState, isMyTurn, getGroup]); // UPDATED DEPENDENCY ARRAY

//     const handlePass = useCallback(() => {
//         if (!isMyTurn || !gameState) return;
//         const newPassCount = gameState.passCount + 1;
//         if (newPassCount >= 2) {
//             set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: "Game ended by two consecutive passes." });
//         } else {
//             set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, passCount: newPassCount, currentPlayer: gameState.currentPlayer === BLACK ? WHITE : BLACK });
//         }
//     }, [gameState, isMyTurn]); // UPDATED DEPENDENCY ARRAY

//     const handleResign = useCallback(() => {
//         if (!isMyTurn || !gameState) return;
//         const winner = gameState.currentPlayer === BLACK ? "White" : "Black";
//         set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: `${winner} wins by resignation.` });
//     }, [gameState, isMyTurn]); // UPDATED DEPENDENCY ARRAY

//     // --- Render Logic ---
//     const renderContent = () => {
//         switch (uiView) {
//             case 'loading':
//                 return <div className={styles.pageContainer}>Connecting to game server...</div>;
            
//             case 'modeSelect':
//                 return (
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Start a New Game</h2>
//                         <div className={styles.sizeInputContainer}>
//                             <label htmlFor="board-size">Board Size:</label>
//                             <input
//                                 id="board-size"
//                                 type="number"
//                                 value={boardSizeInput}
//                                 onChange={(e) => setBoardSizeInput(Math.max(5, Math.min(19, parseInt(e.target.value, 10) || 19)))}
//                                 min="5" max="19" step="2"
//                             />
//                         </div>
//                         <p>This will start a new game for everyone, overwriting any game in progress.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => startNewGame('online', null, boardSizeInput)} className={styles.roleButton}>Play Online</button>
//                             <button onClick={() => startNewGame('local', BOTH, boardSizeInput)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Play Both Sides (Local)</button>
//                         </div>
//                     </div>
//                 );

//             case 'colorSelect':
//                 return (
//                     <div className={styles.roleSelectionContainer}>
//                         <h2>Online Game ({gameState?.boardSize}x{gameState?.boardSize})</h2>
//                         <p>A new online game has started. Choose your color to join.</p>
//                         <div className={styles.controls}>
//                             <button onClick={() => handleColorSelect(BLACK)} className={styles.roleButton}>Join as Black</button>
//                             <button onClick={() => handleColorSelect(WHITE)} className={styles.roleButton}>Join as White</button>
//                         </div>
//                         <button onClick={returnToModeSelection} className={`${styles.gameButton} ${styles.resetButton}`}>Back to Main Menu</button>
//                     </div>
//                 );

//             case 'gameBoard':
//                 const getRoleName = (role) => {
//                     if (role === BLACK) return "Black";
//                     if (role === WHITE) return "White";
//                     if (role === BOTH) return "Both Sides (Local Play)";
//                     return "Spectator";
//                 };

//                 return (
//                     <>
//                         <div className={styles.playerInfo}>
//                             Playing as: <strong>{getRoleName(playerRole)}</strong> on a <strong>{gameState.boardSize}x{gameState.boardSize}</strong> board.
//                         </div>
//                         <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
//                         <div className={styles.boardWrapper}>
//                             <Board
//                                 boardState={gameState.boardState}
//                                 boardSize={gameState.boardSize}
//                                 onBoardClick={placeStone}
//                                 isMyTurn={isMyTurn}
//                             />
//                         </div>
//                         <div className={styles.controls}>
//                             <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
//                             <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
//                             <button onClick={returnToModeSelection} className={styles.gameButton}>Exit Game</button>
//                         </div>
//                         {gameState.gameOver && (
//                             <div className={styles.gameOverModal}>
//                                 <div className={styles.gameOverContent}>
//                                     <h2>{gameState.gameOverMessage}</h2>
//                                     <button onClick={returnToModeSelection} className={styles.gameButton}>Back to Menu</button>
//                                 </div>
//                             </div>
//                         )}
//                     </>
//                 );

//             default:
//                 return <div className={styles.pageContainer}>An unexpected error occurred.</div>;
//         }
//     };

//     return (
//         <div className={styles.pageContainer}>
//             <Head>
//                 <title>Go (Baduk) Game - Multiplayer</title>
//             </Head>
//             <div className={styles.gameContainer}>
//                 <h1>Go (Baduk)</h1>
//                 {renderContent()}
//             </div>
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
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const BOTH = 3;
const DB_GAME_ID = 'main-game';
const SESSION_STORAGE_KEY = `go-game-data-${DB_GAME_ID}`;

const createInitialGameState = (size = 19, mode = 'online') => ({
    gameId: Date.now().toString(),
    gameMode: mode,
    boardSize: size,
    boardState: Array(size).fill(0).map(() => Array(size).fill(EMPTY)),
    currentPlayer: BLACK,
    captures: { [BLACK]: 0, [WHITE]: 0 },
    passCount: 0,
    gameOver: false,
    gameOverMessage: '',
    history: [JSON.stringify(Array(size).fill(0).map(() => Array(size).fill(EMPTY)))],
});

export default function GamePage() {
    const [gameState, setGameState] = useState(null);
    const [playerRole, setPlayerRole] = useState(null);
    const [uiView, setUiView] = useState('loading');
    const [boardSizeInput, setBoardSizeInput] = useState(19);

    // --- Synchronization and Setup Effects ---
    useEffect(() => {
        if (!gameState) return;
        const savedDataJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedDataJSON) {
            const savedData = JSON.parse(savedDataJSON);
            if (savedData.gameId === gameState.gameId) {
                setPlayerRole(savedData.role);
                setUiView('gameBoard');
                return;
            }
        }
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setPlayerRole(null);
        if (gameState.gameMode === 'online') {
            setUiView('colorSelect');
        } else {
            setUiView('modeSelect');
        }
    }, [gameState]);

    useEffect(() => {
        const gameRef = ref(db, `games/${DB_GAME_ID}`);
        const unsubscribe = onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                setGameState(snapshot.val());
            } else {
                set(gameRef, createInitialGameState(19, 'modeSelect'));
            }
        });
        return () => unsubscribe();
    }, []);

    // --- User Actions ---
    const startNewGame = (mode, role, size) => {
        const newGame = createInitialGameState(size, mode);
        set(ref(db, `games/${DB_GAME_ID}`), newGame).then(() => {
            if (role) {
                const dataToSave = { role, gameId: newGame.gameId };
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
                setPlayerRole(role);
                // THE FIX: Explicitly set the UI view to the game board.
                // This prevents the sync effect from wrongly reverting it.
                setUiView('gameBoard');
            }
        });
    };

    const handleColorSelect = (role) => {
        if (!gameState) return;
        const dataToSave = { role, gameId: gameState.gameId };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToSave));
        setPlayerRole(role);
        setUiView('gameBoard');
    };

    const returnToModeSelection = useCallback(() => {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setPlayerRole(null);
        setUiView('modeSelect');
    }, []);

    const isMyTurn = gameState && !gameState.gameOver && (playerRole === BOTH || playerRole === gameState.currentPlayer);

    // const getGroup = useCallback(/* ... The full getGroup function ... */);
    // const placeStone = useCallback(/* ... The full placeStone function ... */);
    // const handlePass = useCallback(/* ... The full handlePass function ... */);
    // const handleResign = useCallback(/* ... The full handleResign function ... */);
    
    // (Pasting in the full game logic functions again for completeness)
    const getGroup = useCallback((startX, startY, board, player) => {
        if (!gameState) return { stones: [], liberties: 0 };
        const size = gameState.boardSize;
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
                if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
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
    }, [gameState]);

    const placeStone = useCallback((x, y) => {
        if (!isMyTurn || !gameState || gameState.boardState[y][x] !== EMPTY) return;
        const { boardState, currentPlayer, history, boardSize } = gameState;
        const tempBoard = boardState.map(row => [...row]);
        tempBoard[y][x] = currentPlayer;
        const opponent = currentPlayer === BLACK ? WHITE : BLACK;
        let capturedStonesList = [];
        const neighbors = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];
        for (const { dx, dy } of neighbors) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || tempBoard[ny][nx] !== opponent) continue;
            const group = getGroup(nx, ny, tempBoard, opponent);
            if (group.liberties === 0) {
                capturedStonesList.push(...group.stones);
            }
        }
        for (const stone of capturedStonesList) {
            tempBoard[stone.y][stone.x] = EMPTY;
        }
        const ownGroup = getGroup(x, y, tempBoard, currentPlayer);
        if (ownGroup.liberties === 0) return;
        const nextStateStr = JSON.stringify(tempBoard);
        if (history && history.includes(nextStateStr)) return;
        const newHistory = [...(history || []), nextStateStr];
        const newCaptures = { ...gameState.captures };
        newCaptures[currentPlayer] += capturedStonesList.length;
        const newGameState = { ...gameState, boardState: tempBoard, currentPlayer: opponent, captures: newCaptures, passCount: 0, history: newHistory, };
        set(ref(db, `games/${DB_GAME_ID}`), newGameState);
    }, [gameState, isMyTurn, getGroup]);

    const handlePass = useCallback(() => {
        if (!isMyTurn || !gameState) return;
        const newPassCount = gameState.passCount + 1;
        if (newPassCount >= 2) {
            set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: "Game ended by two consecutive passes." });
        } else {
            set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, passCount: newPassCount, currentPlayer: gameState.currentPlayer === BLACK ? WHITE : BLACK });
        }
    }, [gameState, isMyTurn]);

    const handleResign = useCallback(() => {
        if (!isMyTurn || !gameState) return;
        const winner = gameState.currentPlayer === BLACK ? "White" : "Black";
        set(ref(db, `games/${DB_GAME_ID}`), { ...gameState, gameOver: true, gameOverMessage: `${winner} wins by resignation.` });
    }, [gameState, isMyTurn]);


    // --- Render Logic ---
    const renderContent = () => {
        switch (uiView) {
            case 'loading':
                return <div className={styles.pageContainer}>Connecting to game server...</div>;
            
            case 'modeSelect':
                return (
                    <div className={styles.roleSelectionContainer}>
                        <h2>Start a New Game</h2>
                        <div className={styles.sizeInputContainer}>
                            <label htmlFor="board-size">Board Size:</label>
                            <input
                                id="board-size"
                                type="number"
                                value={boardSizeInput}
                                onChange={(e) => setBoardSizeInput(Math.max(5, Math.min(19, parseInt(e.target.value, 10) || 19)))}
                                min="5" max="19" step="2"
                            />
                        </div>
                        <p>This will start a new game for everyone, overwriting any game in progress.</p>
                        <div className={styles.controls}>
                            <button onClick={() => startNewGame('online', null, boardSizeInput)} className={styles.roleButton}>Play Online</button>
                            <button onClick={() => startNewGame('local', BOTH, boardSizeInput)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Play Both Sides (Local)</button>
                        </div>
                    </div>
                );

            case 'colorSelect':
                return (
                    <div className={styles.roleSelectionContainer}>
                        <h2>Online Game ({gameState?.boardSize}x{gameState?.boardSize})</h2>
                        <p>A new online game has started. Choose your color to join.</p>
                        <div className={styles.controls}>
                            <button onClick={() => handleColorSelect(BLACK)} className={styles.roleButton}>Join as Black</button>
                            <button onClick={() => handleColorSelect(WHITE)} className={styles.roleButton}>Join as White</button>
                        </div>
                        <button onClick={returnToModeSelection} className={`${styles.gameButton} ${styles.resetButton}`}>Back to Main Menu</button>
                    </div>
                );

            case 'gameBoard':
                const getRoleName = (role) => {
                    if (role === BLACK) return "Black";
                    if (role === WHITE) return "White";
                    if (role === BOTH) return "Both Sides (Local Play)";
                    return "Spectator";
                };

                return (
                    <>
                        <div className={styles.playerInfo}>
                            Playing as: <strong>{getRoleName(playerRole)}</strong> on a <strong>{gameState.boardSize}x{gameState.boardSize}</strong> board.
                        </div>
                        <GameStatus currentPlayer={gameState.currentPlayer} captures={gameState.captures} />
                        <div className={styles.boardWrapper}>
                            <Board
                                boardState={gameState.boardState}
                                boardSize={gameState.boardSize}
                                onBoardClick={placeStone}
                                isMyTurn={isMyTurn}
                            />
                        </div>
                        <div className={styles.controls}>
                            <button onClick={handlePass} className={styles.gameButton} disabled={!isMyTurn}>Pass</button>
                            <button onClick={handleResign} className={styles.gameButton} disabled={!isMyTurn}>Resign</button>
                            <button onClick={returnToModeSelection} className={styles.gameButton}>Exit Game</button>
                        </div>
                        {gameState.gameOver && (
                            <div className={styles.gameOverModal}>
                                <div className={styles.gameOverContent}>
                                    <h2>{gameState.gameOverMessage}</h2>
                                    <button onClick={returnToModeSelection} className={styles.gameButton}>Back to Menu</button>
                                </div>
                            </div>
                        )}
                    </>
                );

            default:
                return <div className={styles.pageContainer}>An unexpected error occurred.</div>;
        }
    };

    return (
        <div className={styles.pageContainer}>
            <Head>
                <title>Go (Baduk) Game - Multiplayer</title>
            </Head>
            <div className={styles.gameContainer}>
                <h1>Go (Baduk)</h1>
                {renderContent()}
            </div>
        </div>
    );
}