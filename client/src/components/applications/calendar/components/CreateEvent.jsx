import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import Alert from '../../../Alert';
import './CreateEvent.sass';
import axios from 'axios';

const colorOptions = [
  { value: '#444444', label: <div className="color-circle" style={{ backgroundColor: '#444444' }}></div> },
  { value: '#52acfa', label: <div className="color-circle" style={{ backgroundColor: '#52acfa' }}></div> },
  { value: '#c4f8b0', label: <div className="color-circle" style={{ backgroundColor: '#c4f8b0' }}></div> },
  { value: '#b591ff', label: <div className="color-circle" style={{ backgroundColor: '#b591ff' }}></div> },
  { value: '#f8ce25', label: <div className="color-circle" style={{ backgroundColor: '#f8ce25' }}></div> },
  { value: '#f83f2d', label: <div className="color-circle" style={{ backgroundColor: '#f83f2d' }}></div> }
];

const CreateEvent = ({ userId, onClose }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [color, setColor] = useState(colorOptions[0].value);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isValid, setIsValid] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [userOptions, setUserOptions] = useState([]);
  
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: isDarkMode ? '#363d44' : '#eaeaea',
      color: isDarkMode ? '#ffffff' : '#363d44',
      borderColor: isDarkMode ? '#363d44' : '#eaeaea',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#ffffff',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#363d44',
      color: '#ffffff',
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
      backgroundColor: state.isSelected ? '#2b3036' : '#363d44',
      color: '#ffffff',
      '&:hover': {
        backgroundColor: '#4a525a',
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

  useEffect(() => {
    setIsValid(title.trim() !== '' && startDate !== '' && endDate !== '');
  }, [title, startDate, endDate]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:3001/get-users');
        const options = response.data
          .filter(user => user.user_id !== parseInt(userId))
          .map(user => ({
            value: user.user_id,
            label: user.name
          }));
        setUserOptions(options);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
  
    fetchUsers();
  }, []);
  

  const handleCreateEvent = async () => {
    if (!isValid) {
        setAlertMessage('Te rugăm să introduci detaliile evenimentului!');
    } else {
        const event = {
            title,
            description,
            color,
            created_by: userId,
            start_date: startDate,
            end_date: endDate,
            employees: selectedEmployees.map(emp => emp.value)
        };

        try {
            const response = await axios.post('http://localhost:3001/add-event', event);
            if (response.status === 200) {
              setAlertMessage('Evenimentul a fost adăugat cu succes.');
              window.location.reload();
              onClose();
            } else {
              setAlertMessage('A apărut o eroare.');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            setAlertMessage('A apărut o eroare.');
        }
    }
};

  const handleTitleChange = (event) => {
    setTitle(event.target.value);
    if (event.target.value.length === 0) {
      setTitleError('Titlul nu este introdus.');
    } else {
      setTitleError('');
    }
  };

  const handleDescriptionChange = (event) => {
    setDescription(event.target.value);
    if (event.target.value.length === 0) {
      setDescriptionError('Descrierea nu este introdusă.');
    } else {
      setDescriptionError('');
    }
  };

  const handleStartDateChange = (e) => {
    const selectedStartDate = new Date(e.target.value);
    setStartDate(selectedStartDate.toISOString().split('T')[0]);
  };

  const handleEndDateChange = (e) => {
    const selectedEndDate = new Date(e.target.value);
    setEndDate(selectedEndDate.toISOString().split('T')[0]);
  };

  const handleColorChange = (selectedOption) => {
    setSelectedColor(selectedOption);
    setColor(selectedOption.value);
  };

  const handleEmployeesChange = (selectedOptions) => {
    setSelectedEmployees(selectedOptions);
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className={`event-modal-content ${theme}`} onClick={stopPropagation}>
        <div className='event-header'>
          <h2>Crează eveniment</h2>
          <FontAwesomeIcon icon={faTimes} className={`event-close-icon ${theme}`} onClick={onClose} />
        </div>
        <div className="input-group">
          <label>Introdu titlul</label><br></br>
          <input className={`event-title ${theme}`} placeholder="Introdu titlul" type="text" value={title} onChange={handleTitleChange} />
          {titleError && <p className="error-message">{titleError}</p>}
        </div>
        <div className="date-inputs">
          <div className="input-group">
            <label>Data de start</label>
            <div className='date-input'>
              <input className={`event-deadline ${theme}`} type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={handleStartDateChange} />
            </div>
          </div>
          <div className="input-group">
            <label>Data de final</label>
            <div className='date-input'>
              <input className={`event-deadline ${theme}`} type="date" value={endDate} min={startDate} onChange={handleEndDateChange} />
            </div>
          </div>
        </div>
        <div className='color-select-inputs-group'>
          <div className="input-group">
            <label>Culoare</label>
            <Select
              value={selectedColor}
              onChange={handleColorChange}
              options={colorOptions}
              className={`event-colorSelect ${theme}`}
              styles={customStyles}
            />
          </div>
          <div className="input-group">
            <label>Adresat utilizatorilor</label>
            <Select
              isMulti
              placeholder="Selectează utilizatori"
              value={selectedEmployees}
              onChange={handleEmployeesChange}
              options={userOptions}
              className={`event-employeeSelect ${theme}`}
              styles={customStyles}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Descriere</label>
          <textarea className={`event-description ${theme}`} placeholder="Introdu descrierea evenimentului" value={description} onChange={handleDescriptionChange} />
          {descriptionError && <p className="error-message">{descriptionError}</p>}
        </div>
        <div className='event-bttn-container'>
          <button className="event-bttn" onClick={handleCreateEvent}>Crează eveniment</button>
          <button className={`event-bttn ${theme}`} onClick={onClose}>Anulează</button>
        </div>
      </div>
      {alertMessage !== '' &&
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      }
    </div>
  );
};

export default CreateEvent;