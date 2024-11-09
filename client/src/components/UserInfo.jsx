import React, { useState, useEffect, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';
import PieChart from './applications/tasks/components/PieChart';
import LineChart from './applications/tasks/components/LineChart';
import Alert from './Alert';
import EditUser from './EditUser';
import './UserInfo.sass';

const UserInfo = ({ userId, user_id, position, onClose }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const [userInfo, setUserInfo] = useState(null);
  const [userName, setUserName] = useState('');
  const [isProfilePicture, setIsProfilePicture] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isSubordinate, setIsSubordinate] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [IBAN, setIBAN] = useState('');

  useEffect(() => {
    fetchUserInfo(user_id);
  }, [user_id]);

  useEffect(() => {
    fetchUserName(userId);
  }, [userId]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`http://localhost:3001/tasks/${user_id}`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
          console.log(data);
        } else {
          throw new Error('Failed to fetch tasks.');
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };
  
    fetchTasks();
  }, [user_id]);

  useEffect(() => {
    const fetchBank = (userId) => {
      fetch(`http://localhost:3001/bank/${userId}`).then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch user information.');
      }).then((data) => {
        setIBAN(data.iban);
        console.log(data.iban);
      }).catch((error) => {
        console.error('Error fetching user information:', error);
      });
    };

    fetchBank(user_id);
}, [user_id]);

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

  const fetchUserName = (userId) => {
    fetch(`http://localhost:3001/user/${userId}`).then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to fetch user information.');
    }).then((data) => {
      setUserName(data.name);
      fetchSupervisorPath(user_id, data.name);
    }).catch((error) => {
      console.error('Error fetching user information:', error);
    });
  };

  const fetchSupervisorPath = (userId, userName) => {
    fetch(`http://localhost:3001/userSupervisorPath/${user_id}`)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch supervisor path.');
      })
      .then((data) => {
        const supervisorPath = data.path;
        setIsSubordinate(supervisorPath.includes(userName));
        console.log(userName);
        console.log(supervisorPath);
        console.log(supervisorPath.includes(userName));
      })
      .catch((error) => {
        console.error('Error fetching supervisor path:', error);
      });
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

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const aggregateTasksByMonth = (tasks) => {
    const currentYear = new Date().getFullYear();
    const monthlyCounts = Array(12).fill(0);

    tasks.forEach(task => {
        if (task.status === 'Finalizată') {
            const taskDate = new Date(task.deadline);
            if (taskDate.getFullYear() === currentYear) {
                const monthIndex = taskDate.getMonth();
                monthlyCounts[monthIndex] += 1;
            }
        }
    });

    return monthlyCounts;
  };

  const monthlyFinalizatăTasks = aggregateTasksByMonth(tasks);

  const handleDeleteUser = () => {
    if (window.confirm(`Ești sigur că vrei să ștergi utilizatorul ${userInfo.name}?`)) {
      fetch(`http://localhost:3001/delete-user/${user_id}`, {
        method: 'DELETE'
      })
      .then(response => {
        if (response.ok) {
          setAlertMessage(`Utilizatorul ${userInfo.name} a fost șters.`);
          window.location.reload();
          onClose();
        } else {
          throw new Error('Failed to delete user.');
        }
      })
      .catch(error => {
        console.error('Error deleting user:', error);
        setAlertMessage(`Eroare la ștergerea utilizatorului ${userInfo.name}.`);
      });
    }
  };

  const handleEditUser = () => {
    setIsEditing(true);
  };

  const closeEdit = () => {
    setIsEditing(false);
  }

  const closeAlert = () => {
    setAlertMessage('');
  };

  if (!userInfo) return null;

  return (
    <div className='organigram-user-modal-container' onClick={onClose}>
      <div className={`organigram-user-info ${theme}`} style={{ top: position.y, left: position.x }} onClick={stopPropagation}>
        <div className='organigram-user-info-header'>
          <FontAwesomeIcon icon={faTimes} className={`organigram-user-info-close-icon ${theme}`} onClick={onClose}/>
        </div>
        <div className='organigram-user-info-container'>
          <div className='organigram-user-info-picture-container'>
            <img
              className="organigram-user-info-picture"
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
              alt="Profile"
            />
          </div>
          <div className='organigram-user-info-data'>
            <div className="organigram-user-info-name">
              {userInfo.name}
              {isSubordinate && userName !== userInfo.name &&
                <>
                  <FontAwesomeIcon icon={faEdit} className={`edit-task-icon ${theme}`} onClick={handleEditUser}/>
                  <FontAwesomeIcon icon={faTrashAlt} className={`edit-task-icon ${theme}`} onClick={handleDeleteUser}/>
                </>
              }
            </div>
            <div className="organigram-user-info-job">{userInfo.job}</div>
            <div className="organigram-user-info-email">{userInfo.email}</div>
            <div className="organigram-user-info-phone">{userInfo.phone}</div>
          </div>
          {isSubordinate &&
            <div className='spatiu-pt-manager'>
              <div className='userinfo-pie-chart'>
                <PieChart tasks={tasks} />
              </div>
              <div className='userinfo-line-chart'>
                <LineChart monthlyData={monthlyFinalizatăTasks} />
              </div>
            </div>
          }
        </div>
      </div>
      {alertMessage !== '' && (
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      )}
      {isEditing &&
        <EditUser user={userInfo} user_id={user_id} IBAN={IBAN} onClose={closeEdit}/>
      }
    </div>
  );
};

export default UserInfo;