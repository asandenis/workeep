import React, { useState, useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../../../../App';
import Alert from '../../../Alert';
import EditTask from './EditTask';
import './TaskInfo.sass';

const TaskInfo = ({ userId, task, onClose }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';
  const isCreatedByUser = parseInt(userId) === parseInt(task.created_by);
  const isSolution = task.solution !== '' && task.solution !== null;
  const isFeedback = task.feedback !== '' && task.feedback !== null;
  const [solution, setSolution] = useState(task.solution);
  const [feedback, setFeedback] = useState(task.feedback);
  const [alertMessage, setAlertMessage] = useState('');
  const [isEditingTask, setIsEditingTask] = useState(false);

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  const handleSolutionChange = (event) => {
    setSolution(event.target.value);
  }

  const handleFeedbackChange = (event) => {
    setFeedback(event.target.value);
  }

  const handleSubmitSolution = () => {
    if (solution !== '' && solution !== null) {
      fetch('http://localhost:3001/add-task-solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id, solution }),
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
    } else {
      setAlertMessage('Te rugăm să introduci o soluție validă.');
    }
  };

  const handleSubmitFeedback = () => {
    if (feedback !== '' && feedback !== null) {
      fetch('http://localhost:3001/add-task-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id, feedback }),
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
    } else {
      setAlertMessage('Te rugăm să introduci un feedback valid.');
    }
  };

  const handleOpenCloseTask = () => {
    if (task.status === 'În curs de rezolvare' || task.status === 'Finalizată') {
      fetch('http://localhost:3001/open-close-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id, status: task.status }),
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
    } else {
      setAlertMessage('Status invalid.');
    }
  }

  const closeAlert = () => {
    setAlertMessage('');
  }

  const handleDeleteTask = () => {
    const confirmDelete = window.confirm(`Ești sigur că vrei să ștergi sarcina: ${task.title}?`);
    if (confirmDelete) {
      fetch('http://localhost:3001/delete-task', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId: task.task_id }),
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

  const handleEditTask = () => {
    setIsEditingTask(!isEditingTask);
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className={`modal-content ${theme}`} onClick={stopPropagation}>
        <div className='taskinfo-header'>
          <h2>{task.title}</h2>
          {isCreatedByUser &&
            <div className="edit-task-icons">
                <FontAwesomeIcon icon={faEdit} className={`edit-task-icon ${theme}`} onClick={handleEditTask}/>
                <FontAwesomeIcon icon={faTrashAlt} className={`edit-task-icon ${theme}`} onClick={handleDeleteTask}/>
            </div>
          }
          <FontAwesomeIcon icon={faTimes} className={`taskinfo-close-icon ${theme}`} onClick={onClose} />
        </div>
        <div className="taskinfo-status">
          <span>Status: {task.status}</span>
        </div>
        <div className="taskinfo-description">
          <span>Descriere: {task.description}</span>
        </div>
        {isSolution &&
          <div className="taskinfo-description">
            <span>Rezolvare: {task.solution}</span>
          </div>
        }
        {isFeedback && 
          <div className="taskinfo-description">
            <span>Feedback: {task.feedback}</span>
          </div>
        }
        {!isCreatedByUser && task.status !== 'Finalizată' &&
          <div className="input-group">
            <label>Adaugă o rezolvare</label>
            <textarea className={`resolution ${theme}`} value={solution} onChange={handleSolutionChange} placeholder="Adaugă o rezolvare"></textarea>
          </div>
        }
        {isCreatedByUser && isSolution && task.status !== 'Finalizată' &&
          <div className="input-group">
            <label>Adaugă un feedback</label>
            <textarea className={`resolution ${theme}`} value={feedback} onChange={handleFeedbackChange} placeholder="Adaugă un feedback"></textarea>
          </div>
        }
        {isCreatedByUser &&
          <div className='taskinfo-bttn-container'>
            {isSolution && task.status !== 'Finalizată' &&
              <button className={`taskinfo-bttn ${theme}`} onClick={handleSubmitFeedback}>Trimite feedback-ul</button>
            }
            {task.status === 'În curs de rezolvare' &&
              <button className={`taskinfo-bttn ${theme}`} onClick={handleOpenCloseTask}>Marchează ca finalizată</button>
            }
            {task.status === 'Finalizată' &&
              <button className={`taskinfo-bttn ${theme}`} onClick={handleOpenCloseTask}>Redeschide sarcina</button>
            }
            <button className={`taskinfo-bttn ${theme}`} onClick={onClose}>Anulează</button>
          </div>
        }
        {!isCreatedByUser &&
          <div className='taskinfo-bttn-container'>
            {task.status !== 'Finalizată' &&
              <button className={`taskinfo-bttn ${theme}`} onClick={handleSubmitSolution}>Trimite rezolvarea</button>
            }
            <button className={`taskinfo-bttn ${theme}`} onClick={onClose}>Anulează</button>
          </div>
        }
      </div>
      {alertMessage !== '' && (
        <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
      )}
      {isEditingTask && (
        <EditTask onClose={handleEditTask} task={task}/>
      )}
    </div>
  );
};

export default TaskInfo;