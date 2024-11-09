import React, { useState, useEffect, useRef, useContext } from 'react';
import './Calendar.sass';
import { ThemeContext } from '../../../App';
import CreateEvent from './components/CreateEvent';
import EventInfo from './components/EventInfo';
import Notification from '../../Notification';
import axios from 'axios';
import Cookies from 'js-cookie';

const Calendar = ({ userId, notifications, removeNotification }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventToDisplay, setEventToDisplay] = useState(null);
  const [showRejectedEvents, setShowRejectedEvents] = useState(true);
  const calendarRef = useRef(null);
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const savedShowRejectedEvents = Cookies.get('showRejectedEvents');
    if (savedShowRejectedEvents !== undefined) {
        setShowRejectedEvents(savedShowRejectedEvents === 'true');
    }
  }, []);

  useEffect(() => {
      Cookies.set('showRejectedEvents', showRejectedEvents.toString(), { expires: 365 });
  }, [showRejectedEvents]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/events/${userId}`);
      const fetchedEvents = response.data.map(event => ({
        ...event,
        startDate: new Date(event.start_date),
        endDate: new Date(event.end_date)
      }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  const getDatesForMonth = (year, month) => {
    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    const datesArray = [];
    let currentWeek = [];

    for (let i = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      currentWeek.push({
        date: date,
        disabled: true,
        events: [],
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayEvents = events.filter(event => {
        if (event.startDate && event.endDate) {
          return event.startDate <= date && date <= event.endDate;
        } else {
          return event.date && event.date.toDateString() === date.toDateString();
        }
      });
      currentWeek.push({
        date: date,
        disabled: false,
        currentDay: date.toDateString() === today.toDateString(),
        events: dayEvents,
      });
      if (currentWeek.length === 7) {
        datesArray.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0 && currentWeek[currentWeek.length - 1].date.getMonth() === month) {
      datesArray.push(currentWeek);
    }

    return datesArray;
  };

  const handleDateClick = date => {
    setSelectedDate(date);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleClickOutside = event => {
    if (calendarRef.current && !calendarRef.current.contains(event.target)) {
      setSelectedDate(null);
    }
  };

  const toggleCreateEvent = () => {
    setShowCreateEvent(!showCreateEvent);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayEvent = (event) => {
    setEventToDisplay(event);
  };

  const hideEvent = (updated) => {
    setEventToDisplay(null);
    if (updated) {
      fetchEvents();
    }
  }

  const toggleShowRejectedEvents = () => {
    setShowRejectedEvents(prevState => !prevState);
  };

  return (
    <div className='events-container'>
      <div className='event-display-negatives-container'>
        <input
          type="checkbox"
          id="showRejectedEventsCheckbox"
          checked={showRejectedEvents}
          onChange={toggleShowRejectedEvents}
        />
        <label htmlFor="showRejectedEventsCheckbox" className="checkbox-label">Afișează evenimentele respinse</label>
      </div>
      <div className="calendar-container" ref={calendarRef}>
        <div className="calendar-navigation">
          <button onClick={goToPreviousMonth} className="calendar-bttn" >&lt; Luna anterioară</button>
          <div className="calendar-current-month">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={goToNextMonth} className="calendar-bttn" >Luna viitoare &gt;</button>
        </div>
        <div className="calendar">
          {getDatesForMonth(currentMonth.getFullYear(), currentMonth.getMonth()).map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => {
                let className = `calendar-day ${day.disabled ? 'disabled' : ''}`;
                if (day.currentDay) {
                  className += selectedDate && selectedDate.getTime() === day.date.getTime() ? ` calendar-selected ${theme}` : ` current-day ${theme}`;
                } else if (selectedDate && selectedDate.getTime() === day.date.getTime()) {
                  className += ' calendar-selected';
                }
                return (
                  <div key={dayIndex} className={className} onClick={() => !day.disabled && handleDateClick(day.date)}>
                    <div className="calendar-date">{day.date ? day.date.getDate() : dayIndex % 7 + 1}</div>
                    <div className="calendar-events-container">
                      {day.events
                        .filter(event => showRejectedEvents || event.rsvp !== 'Respins')
                        .map((event, eventIndex) => (
                          <div key={eventIndex} className="calendar-event" style={{ backgroundColor: event.color }} onClick={() => displayEvent(event)}></div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="calendar-selected-date">{selectedDate ? `Data selectată: ${selectedDate.toDateString()}` : 'Nicio selecție'}</div>
        <div className="calendar-buttons-container">
          <div className="calendar-buttons">
            <button className="calendar-bttn-create" onClick={toggleCreateEvent}>Crează eveniment</button>
          </div>
        </div>
        {showCreateEvent && <CreateEvent userId={userId} onClose={toggleCreateEvent} />}
        <div className="notifications-container">
          {notifications.map((notif) => (
            <Notification key={notif.id} id={notif.id} message={notif.message} onClose={removeNotification} />
          ))}
        </div>
      </div>
      {eventToDisplay && <EventInfo userId={userId} event={eventToDisplay} onClose={hideEvent} />}
    </div>
  );
};

export default Calendar;