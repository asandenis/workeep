import React, { useState, useEffect, useContext } from 'react';
import ComingSoon from './ComingSoon';
import AddUser from './AddUser';
import Salary from './Salary';
import LoadingModal from './LoadingModal';
import Notification from './Notification';
import './Homepage.sass';
import tasksApplicationIcon from '../media/img/applicationIcons/tasksApplicationIcon.png';
import filesApplicationIcon from '../media/img/applicationIcons/filesApplicationIcon.png';
import calendarApplicationIcon from '../media/img/applicationIcons/calendarApplicationIcon.png';
import organigramApplicationIcon from '../media/img/applicationIcons/organigramApplicationIcon.png';
import salaryApplicationIcon from '../media/img/applicationIcons/salaryApplicationIcon.png';
import addUserApplicationIcon from '../media/img/applicationIcons/addUserApplicationIcon.png';
import { ThemeContext } from '../App';
import adminsConfig from '../config/adminsConfig.json';

const Homepage = ({ onPageChange, userId, headerHeight, notifications, removeNotification, handleSupervisorChange, handleSupervisorPathChange, setAsAdmin }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSalaryOpen, setIsSalaryOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userJob, setUserJob] = useState('');
  const [userSalary, setUserSalary] = useState('');
  const [userCurrency, setUserCurrency] = useState('');
  const [userHours, setUserHours] = useState('');
  const [userContract, setUserContract] = useState('');
  const [admins, setAdmins] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChief, setIsChief] = useState(false);
  const [loading, setLoading] = useState(false);
  const theme = isDarkMode ? 'dark' : 'light';

  const toggleComingSoon = () => {
    setIsComingSoonOpen(!isComingSoonOpen);
  };

  const toggleAddUser = () => {
    setIsAddUserOpen(!isAddUserOpen);
  };

  const toggleSalary = () => {
    setIsSalaryOpen(!isSalaryOpen);
  };

  useEffect(() => {
    const fetchUserInfo = (userId) => {
      setLoading(true);
      fetch(`http://localhost:3001/user/${userId}`).then((response) => {
        setLoading(false);
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch user information.');
      }).then((data) => {
        setUserName(data.name);
        setUserJob(data.job);
        setUserSalary(data.salary);
        setUserCurrency(data.currency);
        setUserHours(data.hours);
        setUserContract(data.contract);
        handleSupervisorChange(data.supervisor_id);
        fetchUserSupervisorPath(userId);
      }).catch((error) => {
        console.error('Error fetching user information:', error);
      });
    };

    const fetchUserSupervisorPath = (userId) => {
      setLoading(true);
      fetch(`http://localhost:3001/userSupervisorPath/${userId}`).then((response) => {
        setLoading(false);
        if (response.ok) {
          return response.json();
        }
        throw new Error('Failed to fetch user information.');
      }).then((data) => {
        handleSupervisorPathChange(data.path);
      }).catch((error) => {
        console.error('Error fetching user file path:', error);
      });
    }

    fetchUserInfo(userId);
  }, [userId]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = () => {
    setAdmins(adminsConfig.admins);
  }

  useEffect(() => {
    const adminMatch = admins.find(admin => admin.name === userJob);
    if (adminMatch) {
      setIsAdmin(true);
      setAsAdmin();
      if (userJob.includes('Chief')) {
        setIsChief(true);
      } else {
        setIsChief(false);
      }
    } else {
      setIsAdmin(false);
      setIsChief(false);
    }
  }, [userJob, admins]);

  return (
    <div className={`home ${theme}`} style={{ height: `calc(100vh - ${headerHeight}px)` }}>
      <h2 className='title'>Bine ai venit, {userName}!</h2>
      <div className="applications-container">
        <div className="application-container">
          <img src={tasksApplicationIcon} alt="Image2" className={`application ${theme}`} onClick={() => onPageChange('tasks')} />
          <span className="application-text">Sarcini</span>
        </div>
        <div className="application-container">
          <img src={filesApplicationIcon} alt="Image4" className={`application ${theme}`} onClick={() => onPageChange('files')} />
          <span className="application-text">Fișiere</span>
        </div>
        <div className="application-container">
          <img src={calendarApplicationIcon} alt="Image5" className={`application ${theme}`} onClick={() => onPageChange('calendar')} />
          <span className="application-text">Evenimente</span>
        </div>
        <div className="application-container">
          <img src={organigramApplicationIcon} alt="Image6" className={`application ${theme}`} onClick={() => onPageChange('organigram')} />
          <span className="application-text">Organigramă</span>
        </div>
        <div className="application-container">
          <img src={salaryApplicationIcon} alt="Image7" className={`application ${theme}`} onClick={toggleSalary} />
          <span className="application-text">Salariu</span>
        </div>
        {(isAdmin) && (
          <div className="application-container">
            <img src={addUserApplicationIcon} alt="Add User" className={`application ${theme}`} onClick={toggleAddUser} />
            <span className="application-text">Adaugă utilizator</span>
          </div>
        )}
      </div>
      {isComingSoonOpen && <ComingSoon onClose={toggleComingSoon} />}
      {isAddUserOpen && <AddUser onClose={toggleAddUser} />}
      {isSalaryOpen && <Salary onClose={toggleSalary} salary={userSalary} currency={userCurrency} userId={userId} hours={userHours} contract={userContract} userName={userName} />}
      {loading && <LoadingModal />}
      <div className="notifications-container">
        {notifications.map((notif) => (
          <Notification key={notif.id} id={notif.id} message={notif.message} onClose={removeNotification} />
        ))}
      </div>
    </div>
  );
};

export default Homepage;