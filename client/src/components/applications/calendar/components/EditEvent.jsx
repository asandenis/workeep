import React, { useState, useEffect, useContext } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import Alert from '../../../Alert';
import './EditEvent.sass';
import axios from 'axios';

const colorOptions = [
  { value: '#444444', label: <div className="color-circle" style={{ backgroundColor: '#444444' }}></div> },
  { value: '#52acfa', label: <div className="color-circle" style={{ backgroundColor: '#52acfa' }}></div> },
  { value: '#c4f8b0', label: <div className="color-circle" style={{ backgroundColor: '#c4f8b0' }}></div> },
  { value: '#b591ff', label: <div className="color-circle" style={{ backgroundColor: '#b591ff' }}></div> },
  { value: '#f8ce25', label: <div className="color-circle" style={{ backgroundColor: '#f8ce25' }}></div> },
  { value: '#f83f2d', label: <div className="color-circle" style={{ backgroundColor: '#f83f2d' }}></div> }
];

const EditEvent = ({ userId, event, onClose }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const [title, setTitle] = useState(event.title);
  const [titleError, setTitleError] = useState('');
  const [startDate, setStartDate] = useState(new Date(event.start_date).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(event.end_date).toISOString().split('T')[0]);
  const [description, setDescription] = useState(event.description);
  const [descriptionError, setDescriptionError] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [color, setColor] = useState(event.color || colorOptions[0].value);
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
    const fetchUsersAndColor = async () => {
      try {
        const response = await axios.get('http://localhost:3001/get-users');
        const allUsers = response.data;

        const eventUsersResponse = await axios.get(`http://localhost:3001/event-users/${event.event_id}`);
        const eventUsers = eventUsersResponse.data.map(user => ({
          value: user.user_id,
          label: user.name
        }));

        setSelectedEmployees(eventUsers);
        const filteredUsers = allUsers.filter(user => !eventUsers.some(eventUser => eventUser.value === user.user_id))
                                     .filter(user => user.user_id !== parseInt(userId))
                                     .map(user => ({
                                       value: user.user_id,
                                       label: user.name
                                     }));
        setUserOptions(filteredUsers);

        const eventColor = colorOptions.find(option => option.value === event.color);
        if (eventColor) {
          setSelectedColor(eventColor);
          setColor(eventColor.value);
        }
      } catch (error) {
        console.error('Error fetching users and event color:', error);
      }
    };

    fetchUsersAndColor();
  }, [event.event_id, event.color, userId]);

    const handleEditEvent = async () => {
        if (!isValid) {
            setAlertMessage('Te rugăm să introduci detaliile evenimentului!');
        } else {
            try {
                const updatedEvent = {
                    event_id: event.event_id,
                    title,
                    description,
                    color,
                    start_date: startDate,
                    end_date: endDate,
                    user_ids: selectedEmployees.map(employee => employee.value)
                };
                console.log(updatedEvent.user_ids);

                const response = await axios.put('http://localhost:3001/edit-event', updatedEvent);

                if (response.status === 200) {
                    setAlertMessage('Evenimentul a fost actualizat cu succes!');
                    window.location.reload();
                    onClose();
                } else {
                    setAlertMessage('A apărut o eroare la actualizarea evenimentului!');
                }
            } catch (error) {
                console.error('Error updating event:', error);
                setAlertMessage('A apărut o eroare la actualizarea evenimentului!');
            }
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

  const closeAlert = () => {
    setAlertMessage('');
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className={`editevent-modal-content ${theme}`} onClick={stopPropagation}>
        <div className='editevent-header'>
          <h2>Editează evenimentul</h2>
          <FontAwesomeIcon icon={faTimes} className={`editevent-close-icon ${theme}`} onClick={onClose} />
        </div>
        <div className="input-group">
          <label>Titlu</label><br></br>
          <input className={`editevent-title ${theme}`} placeholder="Introdu titlul" type="text" value={title} onChange={handleTitleChange} />
          {titleError && <p className="error-message">{titleError}</p>}
        </div>
        <div className="date-inputs">
          <div className="input-group">
            <label>Data de start</label>
            <div className='date-input'>
              <input className={`editevent-deadline ${theme}`} type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={handleStartDateChange} />
            </div>
          </div>
          <div className="input-group">
            <label>Data de final</label>
            <div className='date-input'>
              <input className={`editevent-deadline ${theme}`} type="date" value={endDate} min={startDate} onChange={handleEndDateChange} />
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
              className={`editevent-colorSelect ${theme}`}
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
              className={`editevent-employeeSelect ${theme}`}
              styles={customStyles}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Descriere</label>
          <textarea className={`editevent-description ${theme}`} placeholder="Introdu descrierea evenimentului" value={description} onChange={handleDescriptionChange} />
          {descriptionError && <p className="error-message">{descriptionError}</p>}
        </div>
        <div className='editevent-bttn-container'>
          <button className="editevent-bttn" onClick={handleEditEvent}>Editează eveniment</button>
          <button className={`editevent-bttn ${theme}`} onClick={onClose}>Anulează</button>
        </div>
      </div>
      {alertMessage !== '' &&
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      }
    </div>
  );
};

export default EditEvent;