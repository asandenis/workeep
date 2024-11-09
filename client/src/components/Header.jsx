import React, { useContext, useState, useEffect } from 'react';
import './Header.sass';
import logoDarkMode from '../media/img/baseIcons/logo-darkMode.png';
import logoLightMode from '../media/img/baseIcons/logo-lightMode.png';
import lightModeIcon from '../media/img/baseIcons/lightModeIcon.png';
import darkModeIcon from '../media/img/baseIcons/darkModeIcon.png';
import ProfilePopup from './ProfilePopup';

import { ThemeContext } from '../App';

const Header = ({ onPageChange, userId, updateHeaderHeight, onLogout }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const [popupVisible, setPopupVisible] = useState(false);
  const [isImgHovered, setImgHovered] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isProfilePicture, setIsProfilePicture] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserInfo(userId);
    }
  }, [userId]);

  useEffect(() => {
    const headerElement = document.querySelector('.header');
    const userIconElement = document.querySelector('.user-icon');
    const logoElement = document.querySelector('.logo');

    const handleTransitionStart = () => {
      headerElement.style.transition = 'none';
    };

    const handleTransitionEnd = () => {
      headerElement.style.transition = '';
      const height = headerElement.offsetHeight;
      updateHeaderHeight(height);
    };

    if (userIconElement) {
      userIconElement.addEventListener('transitionstart', handleTransitionStart);
      userIconElement.addEventListener('transitionend', handleTransitionEnd);
    }

    if (logoElement) {
      logoElement.addEventListener('transitionstart', handleTransitionStart);
      logoElement.addEventListener('transitionend', handleTransitionEnd);
    }

    return () => {
      if (userIconElement) {
        userIconElement.removeEventListener('transitionstart', handleTransitionStart);
        userIconElement.removeEventListener('transitionend', handleTransitionEnd);
      }
      if (logoElement) {
        logoElement.removeEventListener('transitionstart', handleTransitionStart);
        logoElement.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
  }, [updateHeaderHeight]);

  const handleImgHover = () => {
    setImgHovered(true);
  };

  const handleImgLeave = () => {
    setImgHovered(false);
  };

  const fetchUserInfo = (userId) => {
    fetch(`http://localhost:3001/user/${userId}`).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to fetch user information.');
    }).then((data) => {
      setUserInfo(data);
      checkProfilePicture(data.profile_picture_path);
    }).catch((error) => {
      console.error('Error fetching user information:', error);
    });
  };

  const togglePopup = () => {
    if (!userInfo && userId) {
      fetchUserInfo(userId);
    }
    setPopupVisible(!popupVisible);
  };

  const checkProfilePicture = (profilePicturePath) => {
    fetch('http://localhost:3001/isProfilePicture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ profilePicturePath: profilePicturePath })
    })
    .then((response) => {
      if (response.ok) {
        setIsProfilePicture(true);
      } else {
        throw new Error('Failed to send profile picture path.');
      }
    })
    .catch((error) => {
      console.error('Error sending profile picture path:', error);
    });
  };

  return (
    <div className={`header ${isDarkMode ? 'dark' : 'light'}`}>
      <div className="header-left" onClick={() => onPageChange('home')}>
        <img src={isDarkMode ? logoDarkMode : logoLightMode} alt="Logo" className="logo" />
        <span className="header-text">workeep.</span>
      </div>
      <div className="header-right">
        <img
          src={isDarkMode ? darkModeIcon : lightModeIcon}
          alt={isDarkMode ? 'Dark Mode' : 'Light Mode'}
          className="mode-icon"
          onClick={toggleDarkMode}
        />
        {userInfo && (
          <div className='user-icon-container'>
            <img
              src={(() => {
                try {
                  if (isProfilePicture) {
                    return require(`../media/img/profilePictures/${userInfo.profile_picture_path}`);
                  } else {
                    if (userInfo.profile_picture_path === 'basic') {
                      return require('../media/img/profilePictures/basics/basicUserIcon.png');
                    } else {
                      return require('../media/img/profilePictures/basics/NAUserIcon.png');
                    }
                  }
                } catch (error) {
                  return null;
                }
              })()}
              alt="User"
              className="user-icon"
              onMouseEnter={handleImgHover}
              onMouseLeave={handleImgLeave}
              onClick={togglePopup}
            />
          </div>
        )}
      </div>
      {popupVisible && <ProfilePopup onClose={togglePopup} userId={userId} userInfo={userInfo} isImgHovered={isImgHovered} isProfilePicture={isProfilePicture} onLogout={onLogout}/>}
    </div>
  );
};

export default Header;