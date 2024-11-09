import React, { useState, useEffect, useContext } from 'react';
import Tasks from './components/Tasks';
import PieChart from './components/PieChart';
import LineChart from './components/LineChart';
import AddTask from './components/AddTask';
import EditTask from './components/EditTask';
import TaskInfo from './components/TaskInfo';
import Notification from '../../Notification';
import './Dashboard.sass';
import { ThemeContext } from '../../../App';
import axios from 'axios';
import Cookies from 'js-cookie';

const Dashboard = ({ userId, notifications, removeNotification, isAdmin }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? 'dark' : 'light';
    const [tasks, setTasks] = useState([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [showEditTask, setShowEditTask] = useState(false);
    const [showTaskInfo, setShowTaskInfo] = useState(false);
    const [showFinishedTasks, setShowFinishedTasks] = useState(true);

    useEffect(() => {
        const savedShowFinishedTasks = Cookies.get('showFinishedTasks');
        if (savedShowFinishedTasks !== undefined) {
            setShowFinishedTasks(savedShowFinishedTasks === 'true');
        }
    }, []);

    useEffect(() => {
        Cookies.set('showFinishedTasks', showFinishedTasks.toString(), { expires: 365 });
    }, [showFinishedTasks]);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const response = await axios.get(`http://localhost:3001/tasks/${userId}`);
            setTasks(response.data);
            console.log(userId);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    };

    const aggregateTasksByMonth = (tasks) => {
        const currentYear = new Date().getFullYear();
        const monthlyCounts = Array(12).fill(0);

        tasks.forEach(task => {
            if (task.status === 'Finalizată') {
                const taskDate = new Date(task.deadline);
                if (taskDate.getFullYear() === currentYear) {
                    const monthIndex = taskDate.getMonth();
                    monthlyCounts[monthIndex] += 1;
                }
            }
        });

        return monthlyCounts;
    };

    const monthlyFinalizatăTasks = aggregateTasksByMonth(tasks);

    const toggleAddTask = () => {
        setShowAddTask(prevState => !prevState);
    };

    const toggleShowFinishedTasks = () => {
        setShowFinishedTasks(prevState => !prevState);
    };

    const handleAddTaskClose = (added) => {
        setShowAddTask(false);
        if (added) {
            fetchTasks();
        }
    };

    return (
        <div className={`dashboard-container ${theme}`}>
            <div className={`left-panel ${theme}`}>
                <Tasks
                    userId={userId}
                    tasks={tasks}
                    showFinishedTasks={showFinishedTasks}
                    toggleShowFinishedTasks={toggleShowFinishedTasks}
                />
            </div>
            <div className={`right-panel ${theme}`}>
                <div className='right-panel-content'>
                    <div className='pie-chart'>
                        <PieChart tasks={tasks} />
                    </div>
                    <div className='line-chart'>
                        <LineChart monthlyData={monthlyFinalizatăTasks} />
                    </div>
                    {isAdmin &&
                        <button className="add-task" onClick={toggleAddTask}>Adaugă sarcină</button>
                    }
                </div>
            </div>
            <div className="notifications-container">
                {notifications.map((notif) => (
                    <Notification key={notif.id} id={notif.id} message={notif.message} onClose={removeNotification} />
                ))}
            </div>
            {showAddTask && <AddTask userId={userId} onClose={handleAddTaskClose} />}
            {showEditTask && <EditTask onClose={() => setShowEditTask(false)} />}
            {showTaskInfo && <TaskInfo onClose={() => setShowTaskInfo(false)} />}
        </div>
    );
};

export default Dashboard;