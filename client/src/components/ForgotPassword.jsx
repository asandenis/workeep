import React, { useState, useEffect, useContext } from 'react';
import './ForgotPassword.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';
import Alert from './Alert';
import LoadingModal from './LoadingModal';

const ForgotPassword = ({ onClose, email }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? 'dark' : 'light';
    const [emailValue, setEmailValue] = useState(email);
    const [emailError, setEmailError] = useState('');
    const [canReset, setCanReset] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isAlert, setIsAlert] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setEmailValue(email);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Te rugăm să introduci o adresă de email validă.');
            setCanReset(false);
        } else {
            setEmailError('');
            setCanReset(true);
        }
    }, [email]);

    const handleEmailChange = (event) => {
        const emailValue = event.target.value.trim();
        setEmailValue(emailValue);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            setEmailError('Te rugăm să introduci o adresă de email validă.');
            setCanReset(false);
        } else {
            setEmailError('');
            setCanReset(true);
        }
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const resetPassword = () => {
        if (canReset) {
            if (emailValue) {
                setLoading(true);
                fetch('http://localhost:3001/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: emailValue }),
                })
                .then(response => response.json().then(data => ({
                    status: response.status,
                    data
                })))
                .then(({ status, data }) => {
                    setLoading(false);
                    if (status === 200) {
                        setAlertMessage("Un link de resetare a parolei a fost trimis la: " + emailValue + "!");
                        setIsAlert(true);
                    } else {
                        if (status === 404 && data.message === 'User not found') {
                            setAlertMessage("Nu există utilizatori cu email-ul: " + emailValue + "!");
                        } else if (status === 404) {
                            setAlertMessage(data.message);
                        } else {
                            setAlertMessage(data.message || 'A intervenit o eroare. Te rugăm să reîncerci mai târziu!');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error during fetch:', error);
                    setAlertMessage("A intervenit o eroare. Te rugăm să reîncerci mai târziu!");
                });
            } else {
                setAlertMessage("Te rugăm să introduci adresa email!");
            }
        }
    };

    useEffect(() => {
        if (isAlert && alertMessage === '') {
            onClose();
            setIsAlert(false);
        }
    }, [isAlert, alertMessage]);

    const closeAlert = () => {
        setAlertMessage('');
    };

    return (
        <div className="forgotpassword-overlay" onClick={onClose}>
            <div className={`forgotpassword-container ${theme}`} onClick={stopPropagation}>
                <div className="forgotpassword-header">
                    <FontAwesomeIcon icon={faTimes} className={`forgotpassword-close-icon ${theme}`} onClick={onClose} />
                </div>
                <div className="forgotpassword-content">
                    <h1 className="forgotpassword-title">Ai uitat parola?</h1>
                    <div className="forgotpassword-field">
                        <p>Email</p>
                        <input type="text" placeholder="Introdu adresa email" className={`input ${theme}`} value={emailValue} onChange={handleEmailChange} />
                        {emailError && <p className="error-message">{emailError}</p>}
                    </div>
                </div>
                <div className="forgotpassword-footer">
                    <button className={`forgotpassword-button ${theme} ${canReset ? 'reset-enabled' : 'reset-disabled'}`} onClick={resetPassword}>Resetează parola</button>
                    <button className={`forgotpassword-button ${theme}`} onClick={onClose}>Anulează</button>
                </div>
            </div>
            {alertMessage !== '' && (
                <Alert onClose={closeAlert} message={alertMessage}/>
            )}
            {loading && <LoadingModal />}
        </div>
    );
};

export default ForgotPassword;