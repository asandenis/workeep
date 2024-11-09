import React, { useState, useEffect, useRef } from 'react';
import './ProfilePopup.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import EditUserInfo from './EditUserInfo';

const ProfilePopup = ({ onClose, userId, userInfo, isImgHovered, isProfilePicture, onLogout }) => {
  const [topPosition, setTopPosition] = useState(50);
  const [editInfo, setEditInfo] = useState(false);
  const popupRef = useRef();

  useEffect(() => {
    if (isImgHovered) {
      setTopPosition(100);
    } else {
      setTopPosition(80);
    }

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        if (!event.target.classList.contains('user-icon')) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isImgHovered, onClose]);

  const userName = userInfo?.name || 'N/A';
  const userAccountJob = userInfo?.job || 'N/A';
  const userEmail = userInfo?.email || 'N/A';

  const toggleEditInfo = () => {
    setEditInfo(!editInfo);
  };

  return (
    <div ref={popupRef} className="profile-popup" style={{ top: `${topPosition}px` }}>
      <div className="popup-content">
        <div className="user-info">
          <div className='info-edit'>
            <p>{userName}</p>
            <p id='editIcon' onClick={toggleEditInfo}><FontAwesomeIcon icon={faEdit} /></p>
          </div>
          <p>{userAccountJob}</p>
          <p>{userEmail}</p>
        </div>
        <button onClick={onLogout}>Deloghează-te</button>
      </div>
      {editInfo && <EditUserInfo onClose={toggleEditInfo} userId={userId} userInfo={userInfo} isProfilePicture={isProfilePicture} onLogout={onLogout}/>}
    </div>
  );
};

export default ProfilePopup;