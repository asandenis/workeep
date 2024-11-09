import React, { useContext, useEffect } from 'react';
import './Alert.sass';
import alertIconLight from '../media/img/baseIcons/alertIcon-lightMode.png';
import alertIconDark from '../media/img/baseIcons/alertIcon-darkMode.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';

const Alert = ({ onClose, message, stopPropagation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="alert-wrapper" onClick={stopPropagation}>
      <div className={`alert ${theme}`}>
        <div className="alert-content">
          <div className="alert-icon">
            <img src={isDarkMode ? alertIconDark : alertIconLight} alt="Alert Icon" />
          </div>
          <div className="alert-message">
            {message}
          </div>
          <div className="alert-close" onClick={() => onClose()}>
            <FontAwesomeIcon icon={faTimes} className={`alert-close-icon ${theme}`} onClick={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alert;