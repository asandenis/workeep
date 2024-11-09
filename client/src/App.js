import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Cookies from 'js-cookie';
import Header from './components/Header';
import Homepage from './components/Homepage';
import Login from './components/Login';
import NotFoundPage from './components/NotFoundPage';
import Organigram from './components/Organigram';
import ResetPassword from './components/ResetPassword';
import Files from './components/applications/files/Files';
import Calendar from './components/applications/calendar/Calendar';
import Tasks from './components/applications/tasks/Dashboard';
import './App.css';

export const ThemeContext = React.createContext();

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState('login');
  const [userId, setUserId] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [userSupervisor, setUserSupervisor] = useState('unknown');
  const [pathSupervisors, setPathSupervisors] = useState('unknown');
  const [showFinishedTasks, setShowFinishedTasks] = useState(true);
  const [showRejectedEvents, setShowRejectedEvents] = useState(true);
  const wsRef = useRef(null);

  const setAsAdmin = () => {
    setIsAdmin(true);
  }

  const handleSupervisorChange = (supervisorId) => {
    setUserSupervisor(supervisorId);
  }

  const handleSupervisorPathChange = (path) => {
    setPathSupervisors(path);
  }

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleLoginSuccess = (userId) => {
    Cookies.set('userId', userId, { expires: 1 });
    setUserId(userId);
    setCurrentPage('home');
    localStorage.setItem('loggedInTime', Date.now());

    if (wsRef.current) {
      wsRef.current.close();
    }

    const websocket = new WebSocket(`ws://localhost:8080?userId=${userId}`);
    websocket.onopen = () => {
      console.log('WebSocket connection established');
    };
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Received message:', message);
      if (message.type === 'alert') {
        sendNotification(message.text);
      }
    };
    websocket.onclose = () => {
      console.log('WebSocket connection closed');
      wsRef.current = null;
    };
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    wsRef.current = websocket;
  };

  const handleLogout = async () => {
    const hoursWorked = calculateHoursWorked();
    const userIdCookie = await Cookies.get('userId');
    await updateHoursWorked(userIdCookie, hoursWorked);
    setCurrentPage('login');

    if (wsRef.current) {
      console.log('Closing WebSocket connection on logout');
      wsRef.current.close();
      wsRef.current = null;
    }
    Cookies.remove('userIdTest');
    setUserId(null);

    const logoutChannel = new BroadcastChannel('logoutChannel');
    logoutChannel.postMessage('logout');
    logoutChannel.close();
  };

  const calculateHoursWorked = () => {
    const loggedInTime = localStorage.getItem('loggedInTime');
    const logoutTime = Date.now();
    const timeDiff = logoutTime - loggedInTime;
    const hoursWorked = timeDiff / (1000 * 60 * 60);
    return hoursWorked.toFixed(2);
  };

  const updateHoursWorked = async (userId, hoursWorked) => {
    console.log(userId);
    console.log(hoursWorked);
    try {
        const response = await fetch(`http://localhost:3001/update-hours`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userId,
                hoursWorked: hoursWorked,
            }),
        });
        const data = await response.json();
        console.log('Hours updated successfully:', data);
        setUserId(null);
        Cookies.remove('userId');
        localStorage.removeItem('loggedInTime');
        window.location.reload();
    } catch (error) {
        console.error('Error updating hours worked:', error);
        setUserId(null);
        Cookies.remove('userId');
        localStorage.removeItem('loggedInTime');
        window.location.reload();
        throw error;
    }
};

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    Cookies.set('isDarkMode', newMode, { expires: 365 });
  };

  const updateHeaderHeight = (height) => {
    setHeaderHeight(height);
  };

  useEffect(() => {
    const savedDarkMode = Cookies.get('isDarkMode');
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('light', !isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const userIdCookie = Cookies.get('userId');
    if (userIdCookie) {
      setUserId(userIdCookie);
      setCurrentPage('home');
      handleLoginSuccess(userIdCookie);
    }
  }, []);

  useEffect(() => {
    const savedShowFinishedTasks = Cookies.get('showFinishedTasks');
    if (savedShowFinishedTasks !== undefined) {
      setShowFinishedTasks(savedShowFinishedTasks === 'true');
    } else {
      Cookies.set('showFinishedTasks', showFinishedTasks.toString(), { expires: 365 });
    }
  }, [showFinishedTasks]);

  useEffect(() => {
    const savedShowRejectedEvents = Cookies.get('showRejectedEvents');
    if (savedShowRejectedEvents !== undefined) {
      setShowRejectedEvents(savedShowRejectedEvents === 'true');
    } else {
      Cookies.set('showRejectedEvents', showRejectedEvents.toString(), { expires: 365 });
    }
  }, [showRejectedEvents]);

  useEffect(() => {
    const logoutChannel = new BroadcastChannel('logoutChannel');
    logoutChannel.onmessage = async (event) => {
      if (event.data === 'logout') {
        window.location.reload();
      }
    };
    return () => {
      logoutChannel.close();
    };
  }, []);

  useEffect(() => {
    const accountUpdatedChannel = new BroadcastChannel('accountUpdated');
    accountUpdatedChannel.onmessage = (event) => {
      if (event.data === 'refresh') {
        window.location.reload();
      }
    };
    return () => {
      accountUpdatedChannel.close();
    };
  }, []);

  useEffect(() => {
    const loginChannel = new BroadcastChannel('loginChannel');
    loginChannel.onmessage = (event) => {
      if (event.data === 'login') {
        window.location.reload();
      }
    };
    return () => {
      loginChannel.close();
    };
  }, []);

  useEffect(() => {
    switch (currentPage) {
      case 'home':
        document.title = 'Acasă';
        break;
      case 'login':
        document.title = 'Login';
        break;
      case 'files':
        document.title = 'Fișiere';
        break;
      case 'organigram':
        document.title = 'Organigramă';
        break;
      case 'calendar':
        document.title = 'Evenimente';
        break;
      case 'tasks':
        document.title = 'Sarcini';
        break;
      case 'reset-password':
        document.title = 'Resetează parola';
        break;
      case 'not-found':
        document.title = 'Pagina nu a fost găsită';
        break;
      default:
        document.title = 'Pagina nu a fost găsită';
    }

    console.log(currentPage);
  }, [currentPage]);

  const sendNotification = (message) => {
    const newNotification = {
      id: Date.now(),
      message,
    };

    setNotifications((prevNotifications) => {
      const updatedNotifications = [...prevNotifications, newNotification];
      if (updatedNotifications.length > 8) {
        updatedNotifications.shift();
      }
      return updatedNotifications;
    });
  };

  const removeNotification = (id) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notif) => notif.id !== id)
    );
  };

  return (
    <Router>
      <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
        <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
          <Routes>
            <Route
              path='/'
              element={
                currentPage === 'home' ? (
                  <>
                    <Header onPageChange={handlePageChange} userId={userId} updateHeaderHeight={updateHeaderHeight} onLogout={handleLogout} />
                    <Homepage onPageChange={handlePageChange} userId={userId} headerHeight={headerHeight} notifications={notifications} removeNotification={removeNotification} handleSupervisorChange={handleSupervisorChange} handleSupervisorPathChange={handleSupervisorPathChange} setAsAdmin={setAsAdmin}/>
                  </>
                ) : currentPage === 'login' ? (
                  <Login onPageChange={handlePageChange} onLoginSuccess={handleLoginSuccess} />
                ) : currentPage === 'files' ? (
                  <>
                    <Header onPageChange={handlePageChange} userId={userId} updateHeaderHeight={updateHeaderHeight} onLogout={handleLogout}/>
                    <Files userId={userId} userSupervisor={userSupervisor} pathSupervisors={pathSupervisors} notifications={notifications} removeNotification={removeNotification} />
                  </>
                ) : currentPage === 'organigram' ? (
                  <>
                    <Header onPageChange={handlePageChange} userId={userId} updateHeaderHeight={updateHeaderHeight} onLogout={handleLogout}/>
                    <Organigram userId={userId} notifications={notifications} removeNotification={removeNotification} />
                  </>
                ) : currentPage === 'calendar' ? (
                  <>
                    <Header onPageChange={handlePageChange} userId={userId} updateHeaderHeight={updateHeaderHeight} onLogout={handleLogout}/>
                    <Calendar userId={userId} notifications={notifications} removeNotification={removeNotification} />
                  </>
                ) : currentPage === 'tasks' ? (
                  <>
                    <Header onPageChange={handlePageChange} userId={userId} updateHeaderHeight={updateHeaderHeight} onLogout={handleLogout}/>
                    <Tasks userId={userId} headerHeight={headerHeight} notifications={notifications} removeNotification={removeNotification} isAdmin={isAdmin}/>
                  </>
                ) : (
                  <NotFoundPage  onPageChange={handlePageChange}/>
                )
              }
            />
            <Route path="/reset-password" element={<ResetPassword onPageChange={handlePageChange} />} />
            <Route path="*" element={<NotFoundPage onPageChange={handlePageChange} />} />
          </Routes>
        </div>
      </ThemeContext.Provider>
    </Router>
  );
};

export default App;