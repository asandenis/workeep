import React, { useContext } from 'react';
import './ComingSoon.sass';
import { ThemeContext } from '../App';

const ComingSoon = ({ onClose }) => {
    const { isDarkMode } = useContext(ThemeContext);

    const theme = isDarkMode ? 'dark' : 'light';

    return (
        <div className="comingsoon-overlay" onClick={onClose}>
            <div className={`comingsoon-container ${theme}`}>
                <span className="comingsoon-text">Coming Soon!</span>
            </div>
        </div>
    );
};

export default ComingSoon;