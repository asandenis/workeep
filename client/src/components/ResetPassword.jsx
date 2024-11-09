import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ThemeContext } from '../App';
import axios from 'axios';
import Cookies from 'js-cookie';
import logoDarkMode from '../media/img/baseIcons/logo-darkMode.png';
import logoLightMode from '../media/img/baseIcons/logo-lightMode.png';
import lightModeIcon from '../media/img/baseIcons/lightModeIcon.png';
import darkModeIcon from '../media/img/baseIcons/darkModeIcon.png';
import './ResetPassword.sass';
import Alert from './Alert';
import LoadingModal from './LoadingModal';

const ResetPassword = ({ onPageChange }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [token, setToken] = useState(null);
  const [tokenState, setTokenState] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [canReset, setCanReset] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = isDarkMode ? 'dark' : 'light';

  const location = useLocation();

  useEffect(() => {
    onPageChange('reset-password');
    document.title = 'Resetează parola';
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenFromUrl = params.get('token');
    setToken(tokenFromUrl);
  }, [location.search]);

  useEffect(() => {
    const userIdCookie = Cookies.get('userId');
    setIsLoggedIn(!!userIdCookie);
  }, []);

  useEffect(() => {
    if(isLoggedIn) {
      setTokenState('logged-in');
    } else {
      if(token !== null && token !== '') {
        if (!isNaN(token) && !isNaN(parseFloat(token))) {
          if (token >= 100000000000 && token <= 999999999999) {
            setLoading(true);
            axios.get(`http://localhost:3001/check-token-state?token=${token}`)
            .then(response => {
              setLoading(false);
              const used = response.data.used;
              setName(response.data.name);
              setEmail(response.data.email);
              setTokenState(used ? 'used' : 'unused');
            })
            .catch(error => {
              if (error.response && error.response.status === 404) {
                setTokenState('null');
              } else {
                console.error('Error checking token state:', error);
                setTokenState('null');
              }
            });
          } else {
            setTokenState('invalid');
          }
        } else {
          setTokenState('invalid');
        }
      } else {
        setTokenState('null');
      }
    }
  }, [token]);

  useEffect(() => {
    if(passwordError === '' && confirmPasswordError === '' && password !== '' && confirmPassword !== '' && password === confirmPassword && !isLoggedIn) {
      setCanReset(true);
    } else {
      setCanReset(false);
    }
  }, [passwordError, confirmPasswordError, password, confirmPassword])

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if(e.target.value.length < 8) {
      setPasswordError('Noua parolă trebuie să aibă cel puțin 8 caractere.');
    } else {
      setPasswordError('');
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    if(e.target.value !== password) {
      setConfirmPasswordError('Parolele trebuie să fie aceleași.');
    } else {
      setConfirmPasswordError('');
    }
  };

  const handleResetPassword = () => {
    if(passwordError === '' && confirmPasswordError === '' && password !== '' && confirmPassword !== '' && password === confirmPassword && !isLoggedIn && canReset) {
      setLoading(true);
      axios.post('http://localhost:3001/reset-password', {
        email: email,
        newPassword: password,
        token: token
      })
      .then(results => {
        setLoading(false);
        setAlertMessage(`Parolă schimbată pentru ${name}!`);
        setTokenState('used');
      })
      .catch(error => {
        if (error.response && error.response.status === 400 && error.response.data === 'New password cannot be the same as the old one') {
          setAlertMessage("Noua parolă trebuie să fie diferită față de cea veche!");
        } else {
          setAlertMessage("A intervenit o eroare! Te rugăm să reîncerci mai târziu!");
        }
      });
    }
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

  const logo = isDarkMode ? logoDarkMode : logoLightMode;

  return (
    <div className={`reset-password ${theme}`}>
      <div className='reset-password-theme'>
        <img
          src={isDarkMode ? darkModeIcon : lightModeIcon}
          alt={isDarkMode ? 'Dark Mode' : 'Light Mode'}
          className="mode-icon"
          onClick={toggleDarkMode}
        />
      </div>
      {tokenState === 'unused' ? (
        <div className="reset-password-container">
          <img src={logo} alt="Logo" className="reset-password-logo" />
          <div className="reset-password-form">
            <h1 className='title-reset'>Resetează-ți parola, {name}!</h1>
            <input
              type="password"
              placeholder="Parolă nouă"
              value={password}
              onChange={handlePasswordChange}
              className={`reset-password-input ${theme}`}
            />
            {passwordError && <p className="error-message">{passwordError}</p>}
            <input
              type="password"
              placeholder="Confirmă parola"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={`reset-password-input ${theme}`}
            />
            {confirmPasswordError && <p className="error-message">{confirmPasswordError}</p>}
            <button onClick={handleResetPassword} className={`reset-password-button ${theme} ${canReset ? 'enabled' : 'disabled'}`}>
              Resetează parola
            </button>
          </div>
        </div>
      ) : tokenState === 'used' ? (
        <h1>Jetonul a fost utilizat!</h1>
      ) : tokenState === 'logged-in' ? (
        <h1>Te rugăm să te deloghezi pentru a reseta parola!</h1>
      ) : (
        <h1>Jeton invalid sau nul!</h1>
      )}
      {alertMessage !== '' && (
          <Alert onClose={closeAlert} message={alertMessage}/>
      )}
      {loading && <LoadingModal />}
    </div>
  );
};

export default ResetPassword;