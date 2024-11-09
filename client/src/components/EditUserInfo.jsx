import React, { useState, useContext, useRef, useEffect } from 'react';
import './EditUserInfo.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';
import Alert from './Alert';
import LoadingModal from './LoadingModal';

import axios from 'axios';

const EditUserInfo = ({ onClose, userId, userInfo, isProfilePicture, onLogout }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? 'dark' : 'light';
    const [name, setName] = useState(userInfo.name);
    const [email, setEmail] = useState(userInfo.email);
    const [phoneNumber, setPhoneNumber] = useState(userInfo.phone);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [showIcons, setShowIcons] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [repeatPasswordError, setRepeatPasswordError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [newProfilePicture, setNewProfilePicture] = useState('');
    const [isDeleted, setIsDeleted] = useState(false);
    const [lastEdited, setLastEdited] = useState('');
    const [canSave, setCanSave] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [isInfoChanged, setIsInfoChanged] = useState(false);
    const [isPasswordChanged, setIsPasswordChanged] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const conditionsMet = emailError === '' && phoneError === '' && newPasswordError === '' && repeatPasswordError === '' && ((isDeleted && isProfilePicture) || newProfilePicture !== '' || name !== userInfo.name || email !== userInfo.email || phoneNumber !== userInfo.phone || (oldPassword !== '' && newPassword !== '' && repeatPassword !== '' && newPassword === repeatPassword));
        const passwordConditionsNotMet = (oldPassword !== '' && (newPassword === '' || repeatPassword === '')) || (newPassword !== '' && (oldPassword === '' || repeatPassword === '')) || (repeatPassword !== '' && (newPassword === '' || oldPassword === ''));

        const lastEditedDate = new Date(lastEdited);
        const currentDate = new Date();
        const isDateConditionMet = (currentDate - lastEditedDate) >= 24 * 60 * 60 * 1000;

        setCanSave(conditionsMet && !passwordConditionsNotMet && isDateConditionMet);
    }, [emailError, phoneError, newPasswordError, repeatPasswordError, isDeleted, newProfilePicture, oldPassword, newPassword, repeatPassword, name, email, phoneNumber, lastEdited, userInfo]);

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
                setLastEdited(data.last_modified);
            }).catch((error) => {
                console.error('Error fetching user information:', error);
            });
        };
    
        fetchUserInfo(userId);
      }, [userId]);

    const handleNameChange = (event) => {
        const updatedName = event.target.value.replace(/[^a-zA-Z\s-]/g, '');
        setName(updatedName);
    };

    const handleEmailChange = (event) => {
        const emailValue = event.target.value.trim();
        setEmail(emailValue);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            setEmailError('Te rugăm să introduci o adresă email validă.');
        } else {
            setEmailError('');
        }
    };

    const handlePhoneNumberChange = (e) => {
        const inputPhoneNumber = e.target.value;
        if (/^\d{0,10}$/.test(inputPhoneNumber)) {
          setPhoneNumber(inputPhoneNumber);
        }

        if (!/^\d{10}$/.test(inputPhoneNumber)) {
            setPhoneError('Te rugăm să introduci un număr de telefon valid.');
        } else {
            setPhoneError('');
        }
    };

    const handleToggleChangePassword = () => {
        if(showChangePassword) {
            setNewPasswordError('');
            setRepeatPasswordError('');
            setOldPassword('');
            setNewPassword('');
            setRepeatPassword('');
            setShowChangePassword(!showChangePassword);
        } else {
            setShowChangePassword(!showChangePassword);
        }
    };

    const handleOldPasswordChange = (event) => {
        setOldPassword(event.target.value);
    };

    const handleNewPasswordChange = (event) => {
        const newPasswordValue = event.target.value;
        setNewPassword(newPasswordValue);
    
        if (newPasswordValue.length < 8) {
            setNewPasswordError('Noua parolă nu poate avea mai puțin de 8 caractere.');
        } else if (newPasswordValue === oldPassword) {
            setNewPasswordError('Noua parolă nu poate fi aceeași cu cea veche.');
        } else {
            setNewPasswordError('');
        }
    };

    const handleRepeatPasswordChange = (event) => {
        setRepeatPassword(event.target.value);

        if (event.target.value !== newPassword) {
            setRepeatPasswordError('Parolele introduse trebuie să corespundă.');
        } else {
            setRepeatPasswordError('');
        }
    };

    const handleSave = () => {
        if (canSave) {
            const data = {
                name,
                email,
                phone: phoneNumber,
                oldPassword,
                newPassword,
                newProfilePicture,
                isDeleted
            };

            setLoading(true);

            axios.post(`http://localhost:3001/updateUser/${userId}`, data)
            .then(response => {
                setLoading(false);
                if(response.data === 'Password changed successfully') {
                    setAlertMessage("Informații personale și legate de parolă actualizate cu succes!");
                    setIsPasswordChanged(true);
                } else {
                    setAlertMessage("Informații personale actualizate cu succes!");
                    setIsInfoChanged(true);
                }
            })
            .catch(error => {
                if (error.response.data === 'Old password is incorrect') {
                    setAlertMessage("Parola introdusă nu este corectă!");
                } else {
                    setAlertMessage("Informațiile personale nu au putut fi actualizate! Te rugăm să reîncerci mai târziu!");
                }
                console.error('Error updating user:', error);
            });
        } else {
            const conditionsMet = emailError === '' && phoneError === '' && newPasswordError === '' && repeatPasswordError === '' && ((isDeleted && isProfilePicture) || newProfilePicture !== '' || name !== userInfo.name || email !== userInfo.email || phoneNumber !== userInfo.phone || (oldPassword !== '' && newPassword !== '' && repeatPassword !== '' && newPassword === repeatPassword));
            const passwordConditionsNotMet = (oldPassword !== '' && (newPassword === '' || repeatPassword === '')) || (newPassword !== '' && (oldPassword === '' || repeatPassword === '')) || (repeatPassword !== '' && (newPassword === '' || oldPassword === ''));
            const lastEditedDate = new Date(lastEdited);
            const currentDate = new Date();
            const isDateConditionMet = (currentDate - lastEditedDate) >= 24 * 60 * 60 * 1000;

            if (conditionsMet && !passwordConditionsNotMet && !isDateConditionMet) {
                setAlertMessage("S-au modificat informațiile personale acum mai puțin de 24 de ore!");
            }
        }
    };

    useEffect(() => {
        if (isInfoChanged && alertMessage === '') {
            onClose();
            const broadcastChannel = new BroadcastChannel('accountUpdated');
            broadcastChannel.postMessage('refresh');
            setIsInfoChanged(false);
        }
    }, [isInfoChanged, alertMessage]);

    useEffect(() => {
        if (isPasswordChanged && alertMessage === '') {
            onClose();
            onLogout();
        }
    }, [isPasswordChanged, alertMessage]);

    const handleToggleIcons = () => {
        setShowIcons(!showIcons);
    };

    const handleDeleteProfilePicture = () => {
        setIsDeleted(true);
        setNewProfilePicture('');
    };

    const handleFileInputChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        uploadProfilePicture(file, userId);
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        setSelectedFile(file);
        uploadProfilePicture(file, userId);
    };

    const uploadProfilePicture = (file, userId) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', userId);

        setLoading(true);

        axios.post(`http://localhost:3001/uploadProfilePicture/${userId}`, formData)
          .then(response => {
            setLoading(false);
            setNewProfilePicture(response.data.tempFileName);
            setIsDeleted(false);
          })
          .catch(error => {
            console.error('Error uploading profile picture:', error);
          });
    };

    const handlePlusIconClick = () => {
        fileInputRef.current.click();
    };

    const handleClose = (userId) => {
        const formData = new FormData();
        formData.append('userId', userId);
        setLoading(true);

        axios.post(`http://localhost:3001/deleteTempProfilePicture/${userId}`, formData)
          .then(response => {
            setLoading(false);
            onClose();
          })
          .catch(error => {
            console.error('Error deleting temporary profile picture:', error);
            onClose();
          });
    };

    const closeAlert = () => {
        setAlertMessage('');
    }

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    return (
        <div className={`edit-user-overlay ${showChangePassword ? 'scale-down' : ''}`} onClick={() => handleClose(userId)}>
            <div className={`edit-user-container ${theme}`} onClick={stopPropagation}>
                <div className="edit-user-header">
                    <h2>Editează informațiile personale</h2>
                    <FontAwesomeIcon icon={faTimes} className={`edit-user-close-icon ${theme}`} onClick={() => handleClose(userId)} />
                </div>
                <div className="edit-user-content">
                    <div className="edit-user-profile-picture" onMouseEnter={handleToggleIcons} onMouseLeave={handleToggleIcons} onDrop={handleDrop} onDragOver={handleDragOver}>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileInputChange} style={{ display: 'none' }} />
                        <img src={(() => {
                            try {
                                if (!isDeleted && newProfilePicture === '') {
                                    if (isProfilePicture) {
                                        return require(`../media/img/profilePictures/${userInfo.profile_picture_path}`);
                                    } else {
                                        if (userInfo.profile_picture_path === 'basic') {
                                            return require('../media/img/profilePictures/basics/basicUserIcon.png');
                                        } else {
                                            return require('../media/img/profilePictures/basics/NAUserIcon.png');
                                        }
                                    }
                                } else {
                                    if (isDeleted) {
                                        return require('../media/img/profilePictures/basics/basicUserIcon.png');
                                    } else {
                                        return require(`../media/img/profilePictures/temp/${newProfilePicture}`);
                                    }
                                }
                            } catch (error) {
                                return null;
                            }
                        })()} alt="Profile" />
                        {showIcons && (isProfilePicture || newProfilePicture) && (
                            <div className="edit-user-icons">
                                <FontAwesomeIcon icon={faPlus} className={`edit-user-icon ${theme}`} style={{ marginLeft: '10px' }} onClick={handlePlusIconClick}/>
                                <FontAwesomeIcon icon={faTrashAlt} className={`edit-user-icon ${theme}`} style={{ marginRight: '10px' }} onClick={handleDeleteProfilePicture} />
                            </div>
                        )}
                        {showIcons && !isProfilePicture && !newProfilePicture && (
                            <div className="edit-user-icons">
                                <FontAwesomeIcon icon={faPlus} className={`edit-user-icon ${theme}`} onClick={handlePlusIconClick}/>
                            </div>
                        )}
                    </div>
                    <div className="edit-user-fields">
                        <div className="edit-user-field">
                            <label>Nume</label>
                            <input type="text" value={name} onChange={handleNameChange} />
                        </div>
                        <div className="edit-user-field">
                            <label>Adresă email</label>
                            <input type="email" value={email} onChange={handleEmailChange} />
                            {emailError && <p className="error-message">{emailError}</p>}
                        </div>
                        <div className="edit-user-field">
                            <label>Număr de telefon</label>
                            <input type="tel" value={phoneNumber} onChange={handlePhoneNumberChange} maxLength={10} pattern="[0-9]*"/>
                            {phoneError && <p className="error-message">{phoneError}</p>}
                        </div>
                        {showChangePassword && (
                            <div className="edit-user-change-password">
                                <h3>Schimbă parola</h3>
                                <div className="edit-user-field">
                                    <label>Parola veche</label>
                                    <input type="password" value={oldPassword} onChange={handleOldPasswordChange} />
                                </div>
                                <div className="edit-user-field">
                                    <label>Parola nouă</label>
                                    <input type="password" value={newPassword} onChange={handleNewPasswordChange} />
                                    {newPasswordError && <p className="error-message">{newPasswordError}</p>}
                                </div>
                                <div className="edit-user-field">
                                    <label>Repetă parola nouă</label>
                                    <input type="password" value={repeatPassword} onChange={handleRepeatPasswordChange} />
                                    {repeatPasswordError && <p className="error-message">{repeatPasswordError}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="edit-user-footer">
                    <button className={`edit-user-button ${theme} ${canSave ? 'save-enabled' : 'save-disabled'}`} onClick={handleSave}>Salvează</button>
                    <button className={`edit-user-button ${theme}`} onClick={() => handleClose(userId)}>Anulează</button>
                    <button className={`edit-user-button ${theme}`} onClick={handleToggleChangePassword}>
                        {showChangePassword ? 'Ascunde parola' : 'Schimbă parola'}
                    </button>
                </div>
            </div>
            {alertMessage !== '' && (
                <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
            )}
            {loading && <LoadingModal />}
        </div>
    );
};

export default EditUserInfo;