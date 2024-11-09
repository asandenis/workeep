import React, { useContext, useEffect } from 'react';
import { ThemeContext } from '../App';
import './NotFoundPage.sass';
import lightModeIcon from '../media/img/baseIcons/lightModeIcon.png';
import darkModeIcon from '../media/img/baseIcons/darkModeIcon.png';

const NotFoundPage = ({ onPageChange }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    onPageChange('not-found');
    document.title = 'Pagina nu a fost găsită';
  }, []);

  return (
    <div className={`not-found-page ${theme}`}>
      <div className='not-found-theme'>
        <img
          src={isDarkMode ? darkModeIcon : lightModeIcon}
          alt={isDarkMode ? 'Dark Mode' : 'Light Mode'}
          className="mode-icon"
          onClick={toggleDarkMode}
        />
      </div>
      <div className='not-found-content'>
        <h1 className="not-found-title">404 - Page Not Found</h1>
        <p className="not-found-message">The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;