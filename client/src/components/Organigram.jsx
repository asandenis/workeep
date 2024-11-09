import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import './Organigram.sass';
import { ThemeContext } from '../App';
import Notification from './Notification';
import UserInfo from './UserInfo';

const Organigram = ({ userId, notifications, removeNotification }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const [hierarchy, setHierarchy] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [hoveredUser, setHoveredUser] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    axios.get('http://localhost:3001/user-hierarchy')
      .then(response => setHierarchy(buildHierarchy(response.data)))
      .catch(error => console.error('Error fetching user hierarchy:', error));
  }, []);

  const buildHierarchy = (users) => {
    const map = new Map();
    const roots = [];

    users.forEach(user => {
      user.children = [];
      map.set(user.user_id, user);
    });

    users.forEach(user => {
      if (user.supervisor_id) {
        if (map.has(user.supervisor_id)) {
          map.get(user.supervisor_id).children.push(user);
        }
      } else {
        roots.push(user);
      }
    });

    return roots;
  };

  const toggleNode = (user, level) => {
    setExpandedNodes(prevState => {
      const newExpandedNodes = { ...prevState };
      if (newExpandedNodes[level] && newExpandedNodes[level].user_id === user.user_id) {
        const levelsToDelete = Object.keys(newExpandedNodes).filter(l => parseInt(l) >= level);
        levelsToDelete.forEach(l => delete newExpandedNodes[l]);
      } else {
        newExpandedNodes[level] = user;
        Object.keys(newExpandedNodes).forEach(key => {
          if (parseInt(key) > level) {
            delete newExpandedNodes[key];
          }
        });
      }
      return newExpandedNodes;
    });
  };

  const handleUserClick = (user, e) => {
    if (e.target.classList.contains('arrow')) return;

    setHoveredUser(user);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const renderHierarchy = (users, level = 0) => {
    return users.map(user => (
      <div className={`user-node ${theme}`} key={user.user_id}>
        <div className="user-info-container" onClick={(e) => handleUserClick(user, e)}>
          <div className="user-name">
            {user.name}
          </div>
          <div className="arrow" onClick={() => toggleNode(user, level)}>&#9660;</div>
        </div>
      </div>
    ));
  };

  const renderLevelIndicator = (level) => {
    const levelText = `${level}${level === 1 ? 'st' : level === 2 ? 'nd' : level === 3 ? 'rd' : 'th'}`;
    return <div className="level-indicator">{levelText}</div>;
  };

  const renderExpandedNodes = () => {
    const levels = Object.keys(expandedNodes).sort((a, b) => a - b);
    return levels.map(level => (
      <div key={level}>
        <div className="dotted-line"></div>
        {renderLevelIndicator(parseInt(level) + 2)}
        <div className="sub-nodes">
          {renderHierarchy(expandedNodes[level].children, parseInt(level) + 1)}
        </div>
      </div>
    ));
  };

  return (
    <div className="organigram">
      {renderLevelIndicator(1)}
      <div className="root-nodes">
        {renderHierarchy(hierarchy, 0)}
      </div>
      {renderExpandedNodes()}
      {hoveredUser &&
        <UserInfo 
          userId={userId} 
          user_id={hoveredUser.user_id} 
          position={mousePosition} 
          onClose={() => {
            setHoveredUser(null);
          }} 
        />
      }
      <div className="notifications-container">
        {notifications.map((notif) => (
          <Notification key={notif.id} id={notif.id} message={notif.message} onClose={removeNotification} />
        ))}
      </div>
    </div>
  );
};

export default Organigram;