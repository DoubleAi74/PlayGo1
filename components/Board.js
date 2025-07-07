// // /components/Board.js

// import { useRef, useEffect, useCallback } from 'react';
// import styles from '../styles/Game.module.css';

// const BOARD_SIZE = 10;

// const Board = ({ boardState, onBoardClick, isMyTurn }) => {
//     const canvasRef = useRef(null);

//     const draw = useCallback((ctx, size) => {
//         // ... (The entire drawing logic from the previous step is unchanged)
//         const cellSize = size / (BOARD_SIZE + 1);
//         const boardPadding = cellSize;
//         const stoneRadius = cellSize * 0.45;
//         ctx.fillStyle = '#d2b48c';
//         ctx.fillRect(0, 0, size, size);
//         ctx.strokeStyle = '#333';
//         ctx.lineWidth = 1;
//         for (let i = 0; i < BOARD_SIZE; i++) {
//             const pos = boardPadding + i * cellSize;
//             ctx.beginPath();
//             ctx.moveTo(pos, boardPadding);
//             ctx.lineTo(pos, size - boardPadding);
//             ctx.stroke();
//             ctx.beginPath();
//             ctx.moveTo(boardPadding, pos);
//             ctx.lineTo(size - boardPadding, pos);
//             ctx.stroke();
//         }
//         const starPoints = [3, 9, 15];
//         ctx.fillStyle = '#333';
//         starPoints.forEach(x => {
//             starPoints.forEach(y => {
//                 const cx = boardPadding + x * cellSize;
//                 const cy = boardPadding + y * cellSize;
//                 ctx.beginPath();
//                 ctx.arc(cx, cy, stoneRadius * 0.2, 0, 2 * Math.PI);
//                 ctx.fill();
//             });
//         });
//         if (!boardState) return;
//         for (let y = 0; y < BOARD_SIZE; y++) {
//             for (let x = 0; x < BOARD_SIZE; x++) {
//                 if (boardState[y][x] !== 0) {
//                     const player = boardState[y][x];
//                     const cx = boardPadding + x * cellSize;
//                     const cy = boardPadding + y * cellSize;
//                     ctx.beginPath();
//                     ctx.arc(cx, cy, stoneRadius, 0, 2 * Math.PI);
//                     if (player === 1) {
//                         const gradient = ctx.createRadialGradient(cx - stoneRadius * 0.3, cy - stoneRadius * 0.3, stoneRadius * 0.1, cx, cy, stoneRadius);
//                         gradient.addColorStop(0, '#666');
//                         gradient.addColorStop(1, '#111');
//                         ctx.fillStyle = gradient;
//                     } else {
//                         const gradient = ctx.createRadialGradient(cx - stoneRadius * 0.3, cy - stoneRadius * 0.3, stoneRadius * 0.1, cx, cy, stoneRadius);
//                         gradient.addColorStop(0, '#fff');
//                         gradient.addColorStop(1, '#ccc');
//                         ctx.fillStyle = gradient;
//                     }
//                     ctx.fill();
//                 }
//             }
//         }
//     }, [boardState]);

//     useEffect(() => {
//         const canvas = canvasRef.current;
//         const ctx = canvas.getContext('2d');
//         const container = canvas.parentElement;
//         const observer = new ResizeObserver(entries => {
//             const entry = entries[0];
//             const { width, height } = entry.contentRect;
//             const size = Math.min(width, height);
//             if (size > 0) {
//                 canvas.width = size;
//                 canvas.height = size;
//                 draw(ctx, size);
//             }
//         });
//         observer.observe(container);
//         return () => observer.disconnect();
//     }, [draw]);

//     const handleCanvasClick = (e) => {
//         if (!isMyTurn) return; // Prevent click logic from running if it's not the player's turn
//         const canvas = canvasRef.current;
//         const rect = canvas.getBoundingClientRect();
//         const scaleX = canvas.width / rect.width;
//         const scaleY = canvas.height / rect.height;
//         const canvasX = (e.clientX - rect.left) * scaleX;
//         const canvasY = (e.clientY - rect.top) * scaleY;
//         const cellSize = canvas.width / (BOARD_SIZE + 1);
//         const boardPadding = cellSize;
//         const x = Math.round((canvasX - boardPadding) / cellSize);
//         const y = Math.round((canvasY - boardPadding) / cellSize);
//         if (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
//             onBoardClick(x, y);
//         }
//     };

//     return (
//         <canvas
//             ref={canvasRef}
//             onClick={handleCanvasClick}
//             className={!isMyTurn ? styles.notMyTurn : ''}
//             style={{ width: '100%', height: '100%' }}
//         />
//     );
// };

// export default Board;









// /components/Board.js

import { useRef, useEffect, useCallback } from 'react';
import styles from '../styles/Game.module.css';

/**
 * Calculates symmetrical star point (hoshi) coordinates for a given board size.
 * @param {number} size The size of the board (e.g., 9, 13, 19).
 * @returns {number[]} An array of 0-indexed coordinates for the star points.
 */
const getStarPoints = (size) => {
    if (size < 7 || size % 2 === 0) return []; // Only for odd boards 7x7 or larger

    const center = (size - 1) / 2;
    // Determine corner offset based on board size (4-4 for 19x19, 3-3 for smaller)
    const corner = size >= 13 ? 3 : 2;
    const edge = size - 1 - corner;
    
    // Use a Set to automatically handle duplicates (e.g., on 7x7 corner is center)
    const points = new Set([corner, center, edge]);
    return Array.from(points);
};

const Board = ({ boardState, boardSize, onBoardClick, isMyTurn }) => {
    const canvasRef = useRef(null);

    const draw = useCallback((ctx, canvasRenderSize) => {
        if (!boardSize) return; // Don't draw if boardSize is not yet defined
        
        const cellSize = canvasRenderSize / (boardSize + 1);
        const boardPadding = cellSize;
        const stoneRadius = cellSize * 0.45;

        // 1. Draw Board Grid
        ctx.fillStyle = '#d2b48c';
        ctx.fillRect(0, 0, canvasRenderSize, canvasRenderSize);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;

        for (let i = 0; i < boardSize; i++) {
            const pos = boardPadding + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(pos, boardPadding);
            ctx.lineTo(pos, canvasRenderSize - boardPadding);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(boardPadding, pos);
            ctx.lineTo(canvasRenderSize - boardPadding, pos);
            ctx.stroke();
        }
        
        // 2. Draw Star Points (Hoshi)
        const starPoints = getStarPoints(boardSize);
        ctx.fillStyle = '#333';
        starPoints.forEach(x => {
            starPoints.forEach(y => {
                const cx = boardPadding + x * cellSize;
                const cy = boardPadding + y * cellSize;
                ctx.beginPath();
                ctx.arc(cx, cy, stoneRadius * 0.2, 0, 2 * Math.PI);
                ctx.fill();
            });
        });

        // 3. Draw Stones
        if (!boardState) return;
        for (let y = 0; y < boardSize; y++) {
            for (let x = 0; x < boardSize; x++) {
                if (boardState[y] && boardState[y][x] !== 0) { // Safety check for boardState[y]
                    const player = boardState[y][x];
                    const cx = boardPadding + x * cellSize;
                    const cy = boardPadding + y * cellSize;
                    
                    ctx.beginPath();
                    ctx.arc(cx, cy, stoneRadius, 0, 2 * Math.PI);

                    if (player === 1) { // Black
                        const gradient = ctx.createRadialGradient(cx - stoneRadius * 0.3, cy - stoneRadius * 0.3, stoneRadius * 0.1, cx, cy, stoneRadius);
                        gradient.addColorStop(0, '#666');
                        gradient.addColorStop(1, '#111');
                        ctx.fillStyle = gradient;
                    } else { // White
                        const gradient = ctx.createRadialGradient(cx - stoneRadius * 0.3, cy - stoneRadius * 0.3, stoneRadius * 0.1, cx, cy, stoneRadius);
                        gradient.addColorStop(0, '#fff');
                        gradient.addColorStop(1, '#ccc');
                        ctx.fillStyle = gradient;
                    }
                    ctx.fill();
                }
            }
        }
    }, [boardState, boardSize]);

    // This effect handles resizing and re-drawing the canvas.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        
        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;
            const size = Math.min(width, height);
            if (size > 0) {
                canvas.width = size;
                canvas.height = size;
                draw(ctx, size);
            }
        });
        observer.observe(container);
        return () => observer.disconnect();
    }, [draw]);

    // This handles clicks on the canvas.
    const handleCanvasClick = (e) => {
        if (!isMyTurn) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        const cellSize = canvas.width / (boardSize + 1);
        const boardPadding = cellSize;
        
        const x = Math.round((canvasX - boardPadding) / cellSize);
        const y = Math.round((canvasY - boardPadding) / cellSize);

        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
            onBoardClick(x, y);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={!isMyTurn ? styles.notMyTurn : ''}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default Board;