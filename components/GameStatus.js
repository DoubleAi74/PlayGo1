// /components/GameStatus.js

import styles from '../styles/Game.module.css';

const GameStatus = ({ currentPlayer, captures }) => {
    if (!captures) {
        return <div className={styles.statusPanel}>Loading status...</div>;
    }

    return (
        <div className={styles.statusPanel}>
            <div className={styles.turnIndicator}>
                {currentPlayer === 1 ? (
                    <span className={styles.blackIndicator}>
                        <span className={styles.playerStoneIcon}></span> Black&apos;s Turn
                    </span>
                ) : (
                    <span className={styles.whiteIndicator}>
                        <span className={styles.playerStoneIcon}></span> White&apos;s Turn
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

