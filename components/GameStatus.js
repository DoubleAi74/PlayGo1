// /components/GameStatus.js

import styles from '../styles/Game.module.css';

const GameStatus = ({ currentPlayer, captures }) => {
    // Guard clause to prevent errors if captures object hasn't loaded yet
    if (!captures) {
        return <div className={styles.statusPanel}>Loading status...</div>;
    }

    return (
        <div className={styles.statusPanel}>
            <div className={styles.turnIndicator}>
                {currentPlayer === 1 ? (
                    <span className={styles.blackIndicator}>
                        <span className={styles.playerStoneIcon}></span> Black's Turn
                    </span>
                ) : (
                    <span className={styles.whiteIndicator}>
                        <span className={styles.playerStoneIcon}></span> White's Turn
                    </span>
                )}
            </div>
            <div className={styles.captures}>
                Captures: 
                Black: <span>{captures[2]}</span> | 
                White: <span>{captures[1]}</span>
            </div>
        </div>
    );
};

export default GameStatus;