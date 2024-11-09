import React, { useState, useContext, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faTrashAlt, faStar, faCheck, faTimesCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import Alert from '../../../Alert';
import EditEvent from './EditEvent';
import './EventInfo.sass';

const EventInfo = ({ userId, event, onClose }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const isCreatedByUser = parseInt(userId) === parseInt(event.created_by);
  const [updated, setUpdated] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isEditingEvent, setIsEditingEvent] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3001/user/${event.created_by}`)
      .then(response => response.json())
      .then(data => setOrganizerName(data.name))
      .catch(error => console.error('Error fetching organizer:', error));

    fetch(`http://localhost:3001/event-users/${event.event_id}`)
      .then(response => response.json())
      .then(data => setInvitedUsers(data))
      .catch(error => console.error('Error fetching invited users:', error));
  }, [event.event_id, event.created_by]);

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleAccept = () => {
    fetch('http://localhost:3001/accept-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, eventId: event.event_id }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('RSVP updated successfully:', data);
        setUpdated(true);
        setAlertMessage('Răspunsul a fost actualizat cu succes.');
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        setAlertMessage('A apărut o eroare.');
      });
  };
  
  const handleReject = () => {
    fetch('http://localhost:3001/reject-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, eventId: event.event_id }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('RSVP updated successfully:', data);
        setUpdated(true);
        setAlertMessage('Răspunsul a fost actualizat cu succes.');
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
        setAlertMessage('A apărut o eroare.');
      });
  };

  const handleDeleteEvent = () => {
    const confirmDelete = window.confirm(`Ești sigur că vrei să ștergi evenimentul: ${event.title}?`);
    if (confirmDelete) {
      fetch('http://localhost:3001/delete-event', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId: event.event_id }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.text();
        })
        .then(data => {
          console.log(data);
          window.location.reload();
          onClose();
        })
        .catch(error => {
          console.error('There was a problem with the fetch operation:', error);
          setAlertMessage('A intervenit o eroare.');
      });
    }
  }

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, options);
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

  const handleEditEvent = () => {
    setIsEditingEvent(!isEditingEvent);
  };

  return (
    <div className="modal" onClick={() => onClose(updated)}>
      <div className={`modal-content ${theme}`} onClick={stopPropagation}>
        <div className='eventinfo-header'>
          <h2>{event.title}</h2>
          {isCreatedByUser &&
            <div className="edit-task-icons">
                <FontAwesomeIcon icon={faEdit} className={`edit-task-icon ${theme}`} onClick={handleEditEvent}/>
                <FontAwesomeIcon icon={faTrashAlt} className={`edit-task-icon ${theme}`} onClick={handleDeleteEvent}/>
            </div>
          }
          <FontAwesomeIcon icon={faTimes} className={`taskinfo-close-icon ${theme}`} onClick={() => onClose(updated)} />
        </div>
        <div className="eventinfo-description">
          <span>Descriere: {event.description}</span>
        </div>
        <div className="eventinfo-dates">
          <span>Data de început: {formatDate(event.start_date)}</span><br />
          <span>Data de sfârșit: {formatDate(event.end_date)}</span>
        </div>
        <div className='eventinfo-users'>
            <span>Utilizatori:</span>
            <div className='eventinfo-users-container'>
                <div className={`eventinfo-user ${theme}`}>
                    <span>{organizerName} <FontAwesomeIcon icon={faStar} className={`star-icon ${theme}`} /></span>
                </div>
                {invitedUsers.map(user => (
                    <div className={`eventinfo-user ${theme}`}>
                        <span>{user.name}</span>
                        {user.rsvp === 'Acceptat' && <FontAwesomeIcon icon={faCheck} className={`rsvp-icon ${theme}`} />}
                        {user.rsvp === 'Respins' && <FontAwesomeIcon icon={faTimesCircle} className={`rsvp-icon ${theme}`} />}
                        {user.rsvp !== 'Acceptat' && user.rsvp !== 'Respins' && <FontAwesomeIcon icon={faCircle} className={`rsvp-icon ${theme}`} />}
                    </div>
                ))}
            </div>
        </div>
        {!isCreatedByUser &&
          <div className='eventinfo-bttn-container'>
            <button className={`taskinfo-bttn ${theme}`} onClick={handleAccept}>Acceptă</button>
            <button className={`taskinfo-bttn ${theme}`} onClick={handleReject}>Respinge</button>
          </div>
        }
      </div>
      {alertMessage !== '' &&
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      }
      {isEditingEvent &&
        <EditEvent userId={userId} event={event} onClose={handleEditEvent} />
      }
    </div>
  );
};

export default EventInfo;