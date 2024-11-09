import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import jobsConfig from '../../../../config/jobsConfig.json';
import Alert from '../../../Alert';
import './AddTask.sass';
import axios from 'axios';

const AddTask = ({ userId, onClose }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? 'dark' : 'light';
    const [title, setTitle] = useState('');
    const [titleError, setTitleError] = useState('');
    const [deadline, setDeadline] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionError, setDescriptionError] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [roles, setRoles] = useState([]);
    const [alertMessage, setAlertMessage] = useState('');
    const [isValid, setIsValid] = useState(false);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = () => {
        const formattedRoles = jobsConfig.jobs.map(job => ({
            value: job.id,
            label: job.name
        }));
        setRoles(formattedRoles);
    };

    useEffect(() => {
        setIsValid(title.trim() !== '' && deadline !== '' && description !== '' && selectedRoles.length !== 0);
    }, [title, deadline, description, selectedRoles]);

    const handleAddTask = () => {
        if (!isValid) {
            setAlertMessage('Există câmpuri necompletate!');
        } else {
            const task = {
                userId,
                title,
                deadline,
                description,
                roles: selectedRoles.map(role => role.value)
            };
            axios.post('http://localhost:3001/add-task', task)
                .then(response => {
                    console.log(response.data);
                    onClose(true);
                })
                .catch(error => {
                    console.error('There was an error adding the task!', error);
                });
        }
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
        if (e.target.value.length === 0) {
            setTitleError('Titlul nu este introdus.');
        } else {
            setTitleError('');
        }
    };

    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
        if (e.target.value.length === 0) {
            setDescriptionError('Descrierea nu este introdusă.');
        } else {
            setDescriptionError('');
        }
    };

    const handleDeadlineChange = (e) => {
        const selectedDeadline = new Date(e.target.value);
        setDeadline(selectedDeadline.toISOString().split('T')[0]);
    };

    const handleRolesChange = (selectedOptions) => {
        setSelectedRoles(selectedOptions);
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const closeAlert = () => {
        setAlertMessage('');
    };

    const customStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#363d44' : '#eaeaea',
            color: isDarkMode ? '#ffffff' : '#363d44',
            borderColor: isDarkMode ? '#363d44' : '#eaeaea',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: isDarkMode ? '#ffffff' : '#363d44',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#363d44' : '#eaeaea',
            color: isDarkMode ? '#ffffff' : '#363d44',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: isDarkMode ? '#2b3036' : '#d3d3d3',
            color: isDarkMode ? '#ffffff' : '#363d44',
            display: 'flex',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: isDarkMode ? '#ffffff' : '#363d44',
            maxWidth: '150px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            textOverflow: 'clip',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '::-webkit-scrollbar': {
                display: 'none',
            },
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? (isDarkMode ? '#2b3036' : '#bfbfbf') : (isDarkMode ? '#363d44' : '#eaeaea'),
            color: isDarkMode ? '#ffffff' : '#363d44',
            '&:hover': {
                backgroundColor: isDarkMode ? '#4a525a' : '#dcdcdc',
            },
        }),
        valueContainer: (provided) => ({
            ...provided,
            maxHeight: '70px',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '::-webkit-scrollbar': {
                display: 'none',
            },
        }),
    };

    return (
        <div className="modal" onClick={() => onClose(false)}>
            <div className={`modal-content ${theme}`} onClick={stopPropagation}>
                <div className='addtask-header'>
                    <h2>Adaugă sarcină</h2>
                    <FontAwesomeIcon icon={faTimes} className={`addtask-close-icon ${theme}`} onClick={() => onClose(false)} />
                </div>
                <div className="input-group">
                    <label>Titlu</label>
                    <input className={`addtask-title ${theme}`} placeholder="Introdu titlu" type="text" value={title} onChange={handleTitleChange} />
                    {titleError && <p className="error-message">{titleError}</p>}
                </div>
                <div className="addtask-date-inputs">
                    <div className="input-group">
                        <label>Deadline</label>
                        <div className={`addtask-date-input ${theme}`}>
                            <input className={`addtask-deadline ${theme}`} type="date" value={deadline} min={new Date().toISOString().split('T')[0]} onChange={handleDeadlineChange} />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Adresat funcțiilor</label>
                        <Select
                            isMulti
                            placeholder="Selectează"
                            value={selectedRoles}
                            onChange={handleRolesChange}
                            options={roles}
                            className={`addtask-roleselect ${theme}`}
                            styles={customStyles}
                        />
                    </div>
                </div>
                <div className="input-group">
                    <label>Descriere</label>
                    <textarea className={`addtask-description ${theme}`} placeholder="Introdu descrierea sarcinii" value={description} onChange={handleDescriptionChange} />
                    {descriptionError && <p className="error-message">{descriptionError}</p>}
                </div>
                <div className='addtask-bttn-container'>
                    <button className={`addtask-bttn ${theme}`} onClick={handleAddTask}>Adaugă sarcină</button>
                    <button className={`addtask-bttn ${theme}`} onClick={() => onClose(false)}>Anulează</button>
                </div>
            </div>
            {alertMessage !== '' && (
                <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation} />
            )}
        </div>
    );
};

export default AddTask;