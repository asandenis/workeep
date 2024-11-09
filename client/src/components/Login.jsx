import React, { useState, useContext, useEffect } from 'react';
import { ThemeContext } from '../App';
import logoDarkMode from '../media/img/baseIcons/logo-darkMode.png';
import logoLightMode from '../media/img/baseIcons/logo-lightMode.png';
import lightModeIcon from '../media/img/baseIcons/lightModeIcon.png';
import darkModeIcon from '../media/img/baseIcons/darkModeIcon.png';
import ForgotPassword from './ForgotPassword';
import './Login.sass';
import Alert from './Alert';
import LoadingModal from './LoadingModal';

const Login = ({ onLoginSuccess }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const [email, setEmail] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [canLogin, setCanLogin] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    if (!emailError && email && password && !passwordError) {
      setCanLogin(true);
    } else {
      setCanLogin(false);
    }
  }, [password, passwordError, email, emailError]);

  const toggleForgotPassword = () => {
    setIsForgotPasswordOpen(!isForgotPasswordOpen);
  };

  const handleEmailChange = (e) => {
    const emailValue = e.target.value.trim();
    setEmail(emailValue);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailError('Te rugăm să introduci o adresă de email validă.');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);

    if(e.target.value.length < 8) {
      setPasswordError('Parola introdusă este prea scurtă.')
    } else {
      setPasswordError('');
    }
  };

  const handleLogin = () => {
    if (!emailError && email && password && !passwordError) {
      setLoading(true);
      fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
        .then((response) => {
          setLoading(false);
          if (response.ok) {
            response.json().then(data => {
              const { user_id } = data;
              console.log('Login successful. User ID:', user_id);
              onLoginSuccess(user_id);

              const loginChannel = new BroadcastChannel('loginChannel');
              loginChannel.postMessage('login');
              loginChannel.close();
            });
          } else {
            console.error('Login failed ' + email + ' ' + password);
            setAlertMessage("Email sau parolă greșite!");
          }
        })
        .catch((error) => {
          console.error('Error logging in:', error);
          setAlertMessage("A apărut o eroare! Te rugăm să reîncerci mai târziu!");
        });
    } else {
      setAlertMessage("Asigurați-vă că ați completat toate câmpurile corect!");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.id === 'emailInput') {
        if (password !== '') {
          handleLogin();
        } else {
          document.getElementById('passwordInput').focus();
        }
      } else if (e.target.id === 'passwordInput') {
        if (email !== '') {
          handleLogin();
        } else {
          document.getElementById('emailInput').focus();
        }
      }
    }
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

  const logo = isDarkMode ? logoDarkMode : logoLightMode;

  return (
    <div className={`login ${theme}`}>
      <div className='login-theme'>
        <img
          src={isDarkMode ? darkModeIcon : lightModeIcon}
          alt={isDarkMode ? 'Dark Mode' : 'Light Mode'}
          className="mode-icon"
          onClick={toggleDarkMode}
        />
      </div>
      <div className="login-container">
        <img src={logo} alt="Logo" className="login-logo" />
        <div className="login-form">
          <input
            id="emailInput"
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            onKeyDown={handleKeyDown}
            className={`login-input ${theme}`}
          />
          {emailError && <p className="error-message">{emailError}</p>}
          <input
            id="passwordInput"
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            className={`login-input ${theme}`}
          />
          {passwordError && <p className="error-message">{passwordError}</p>}
          <button onClick={handleLogin} className={`login-button ${theme} ${canLogin ? 'enabled' : 'disabled'}`}>
            Login
          </button>
        </div>
        <p onClick={toggleForgotPassword} className='forgotPass'>Ai uitat parola?</p>
      </div>
      {isForgotPasswordOpen && <ForgotPassword onClose={toggleForgotPassword} email={email} />}
      {alertMessage !== '' && (
          <Alert onClose={closeAlert} message={alertMessage}/>
      )}
      {loading && <LoadingModal />}
    </div>
  );
};

export default Login;