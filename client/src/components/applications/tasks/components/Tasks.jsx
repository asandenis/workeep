import React, { useState } from 'react';
import './Tasks.sass';
import TaskInfo from './TaskInfo';

const getStatusColor = (status) => {
  switch (status) {
    case 'Finalizată':
      return '#5bcc2e';
    case 'În curs de rezolvare':
      return '#fcae24';
    case 'Neasumată':
      return '#f83f2d';
    default:
      return 'gray';
  }
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, options);
};

const Tasks = ({ userId, tasks, showFinishedTasks, toggleShowFinishedTasks }) => {
  const [selectedTask, setSelectedTask] = useState(null);

  const filteredTasks = showFinishedTasks
    ? tasks
    : tasks.filter(task => task.status !== 'Finalizată');

  const sortedTasks = filteredTasks.sort((a, b) => {
    if (a.status !== b.status) {
      const statusOrder = {
        'Neasumată': 1,
        'În curs de rezolvare': 2,
        'Finalizată': 3
      };
      return statusOrder[a.status] - statusOrder[b.status];
    } else {
      return new Date(a.deadline) - new Date(b.deadline);
    }
  });

  const handleTaskInfo = (task) => {
    console.log(userId);
    setSelectedTask(task);
  };

  const handleCloseTaskInfo = () => {
    setSelectedTask(null);
  };

  return (
    <div className="tasks-container">
      <div className='task-display-completed-container'>
        <input
          type="checkbox"
          id="showFinishedTasksCheckbox"
          checked={showFinishedTasks}
          onChange={toggleShowFinishedTasks}
        />
        <label htmlFor="showFinishedTasksCheckbox" className="checkbox-label">Afișează sarcinile finalizate</label>
      </div>
      {sortedTasks.map(task => (
        <div key={task.id} className="task" style={{ backgroundColor: getStatusColor(task.status) }} onClick={() => handleTaskInfo(task)}>
          <span>{task.title}</span>
          <div className='task-basic-info-container'>
            <span className="task-status">{task.status}</span>
            {task.status !== 'Finalizată' && <span className="task-deadline">{formatDate(task.deadline)}</span>}
          </div>
        </div>
      ))}
      {selectedTask && (
        <TaskInfo
          userId={userId}
          task={selectedTask}
          onClose={handleCloseTaskInfo}
        />
      )}
    </div>
  );
};

export default Tasks;