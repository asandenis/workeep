import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import jobsConfig from '../../../../config/jobsConfig.json';
import Alert from '../../../Alert';
import './EditTask.sass';
import axios from 'axios';

const EditTask = ({ onClose, task }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#363d44' : '#eaeaea',
      color: isDarkMode ? '#ffffff' : '#363d44',
      borderColor: isDarkMode ? '#363d44' : '#ccc',
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
      backgroundColor: state.isSelected ? (isDarkMode ? '#2b3036' : '#d3d3d3') : (isDarkMode ? '#363d44' : '#eaeaea'),
      color: isDarkMode ? '#ffffff' : '#363d44',
      '&:hover': {
        backgroundColor: isDarkMode ? '#4a525a' : '#b0b0b0',
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

  const [title, setTitle] = useState(task.title);
  const [titleError, setTitleError] = useState('');
  const [deadline, setDeadline] = useState(new Date(task.deadline).toISOString().split('T')[0]);
  const [description, setDescription] = useState(task.description);
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

    if (task.addressed_to) {
      const initialSelectedRoles = task.addressed_to.split(',').map(role => {
        const job = jobsConfig.jobs.find(job => job.name === role.trim());
        return job ? { value: job.id, label: job.name } : null;
      }).filter(role => role !== null);
      console.log(initialSelectedRoles);
      setSelectedRoles(initialSelectedRoles);
    }
  };

  useEffect(() => {
    setIsValid(title !== '' && title !== null && deadline !== '' && description !== '' && description !== null && selectedRoles.length !== 0);
  }, [title, deadline, description, selectedRoles]);

  const handleRolesChange = (selectedOptions) => {
    setSelectedRoles(selectedOptions);
  };

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    if (event.target.value.length === 0) {
      setTitleError('Titlul nu este introdus.');
    } else {
      setTitleError('');
    }
  }

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
    if (event.target.value.length === 0) {
      setDescriptionError('Descrierea nu este introdusă.');
    } else {
      setDescriptionError('');
    }
  }

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const closeAlert = () => {
    setAlertMessage('');
  }

  const handleEditTask = () => {
    if (!isValid) {
      setAlertMessage('Există câmpuri necompletate!');
    } else {
        const editedTask = {
            taskId: task.task_id,
            title,
            deadline,
            description,
            roles: selectedRoles.map(role => role.value),
            userId: task.created_by
        };
        axios.post('http://localhost:3001/edit-task', editedTask)
            .then(response => {
              setAlertMessage('Sarcina a fost actualizată cu succes!');
                window.location.reload();
                onClose();
            })
            .catch(error => {
              setAlertMessage('A apărut o eroare la actualizarea sarcinii!');
            });
    }
  }

  return (
    <div className="modal-edit-task" onClick={onClose}>
      <div className={`modal-edit-task-content ${theme}`} onClick={stopPropagation}>
        <div className='edittask-header'>
          <h2>Editează sarcina</h2>
          <FontAwesomeIcon icon={faTimes} className={`edittask-close-icon ${theme}`} onClick={onClose} />
        </div>
        <div className="input-group">
          <label>Titlu</label>
          <input className={`edittask-title ${theme}`} placeholder="Introdu titlu" type="text" value={title} onChange={handleTitleChange} />
          {titleError && <p className="error-message">{titleError}</p>}
        </div>
        <div className="edittask-date-inputs">
          <div className="input-group">
            <label>Deadline</label>
            <div className={`edittask-date-input ${theme}`}>
              <input className={`edittask-deadline ${theme}`} type="date" value={deadline} min={new Date().toISOString().split('T')[0]} onChange={(e) => setDeadline(e.target.value)} />
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
              className={`edittask-roleselect ${theme}`}
              styles={customStyles}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Descriere</label>
          <textarea className={`edittask-description ${theme}`} placeholder="Introdu descrierea sarcinii" value={description} onChange={handleDescriptionChange} />
          {descriptionError && <p className="error-message">{descriptionError}</p>}
        </div>
        <div className='edittask-bttn-container'>
          <button className={`edittask-bttn ${theme}`} onClick={handleEditTask}>Editează sarcină</button>
          <button className={`edittask-bttn ${theme}`} onClick={onClose}>Anulează</button>
        </div>
      </div>
      {alertMessage !== '' && (
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      )}
    </div>
  );
};

export default EditTask;