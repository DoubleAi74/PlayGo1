





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
const BOARD_SIZES = [7, 9, 11, 13, 15, 17, 19]; // ADD THIS LINE

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
                            <select
                                id="board-size"
                                value={boardSizeInput}
                                onChange={(e) => setBoardSizeInput(parseInt(e.target.value, 10))}
                                className={styles.sizeSelect}
                            >
                                {BOARD_SIZES.map(size => (
                                    <option key={size} value={size}>
                                        {size} x {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p>This will start a new game for everyone, overwriting any game in progress.</p>
                        <div className={styles.controls}>
                            <button onClick={() => startNewGame('online', null, boardSizeInput)} className={styles.roleButton}>Play on two screens</button>
                            <button onClick={() => startNewGame('local', BOTH, boardSizeInput)} className={`${styles.roleButton} ${styles.localPlayButton}`}>Share this device</button>
                        </div>
                    </div>
                );

            case 'colorSelect':
                return (
                    <div className={styles.roleSelectionContainer}>
                        <h2>Online Game ({gameState?.boardSize}x{gameState?.boardSize})</h2>
                        <p>A new online game has started. Choose your color to join.</p>
                        <div  className={`${styles.controls} ${styles.horizontal}`}>
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
                        <div className={`${styles.controls} ${styles.horizontal}`}>
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