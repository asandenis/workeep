import React, { useContext, useEffect } from 'react';
import './Notification.sass';
import notificationIconLight from '../media/img/baseIcons/notificationIcon-lightMode.png';
import notificationIconDark from '../media/img/baseIcons/notificationIcon-darkMode.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';

const Notification = ({ id, onClose, message }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={`notification ${theme}`}>
      <div className="notification-content">
        <div className="notification-icon">
          <img src={isDarkMode ? notificationIconDark : notificationIconLight} alt="Notification Icon" />
        </div>
        <div className="notification-text">
          {message}
        </div>
        <div className="notification-close" onClick={() => onClose(id)}>
          <FontAwesomeIcon icon={faTimes} className={`notification-close-icon ${theme}`} onClick={onClose} />
        </div>
      </div>
    </div>
  );
};

export default Notification;