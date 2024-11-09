import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './ZipStatus.sass';
import { ThemeContext } from '../../../../App';

const ZipStatus = ({ zipId, onHide }) => {
  const [progress, setProgress] = useState({ totalItems: 0, processedItems: 0, isCompleted: false });
  const [remainingTime, setRemainingTime] = useState(null);
  const [zipPercentage, setZipPercentage] = useState(0);
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const fetchZipProgress = async () => {
      try {
        const response = await axios.get('http://localhost:3002/zip-progress', {
          params: { zipId },
        });
        const progressData = response.data;
        setProgress(progressData);

        if (progressData.totalItems > 0) {
          const percentage = (progressData.processedItems / progressData.totalItems) * 100;
          setZipPercentage(percentage);
        }

        if (!progressData.isCompleted && progressData.processedItems > 0) {
          const remainingItems = progressData.totalItems - progressData.processedItems;
          const averageTimePerItem = 0.5;
          const remainingTimeInSeconds = remainingItems * averageTimePerItem;
          setRemainingTime(remainingTimeInSeconds);
        } else {
          setRemainingTime(null);
        }

        if (progressData.isCompleted) {
          setTimeout(() => {
            onHide();
          }, 3000);
        }
      } catch (err) {
        console.error('Error fetching zip progress:', err);
      }
    };

    const interval = setInterval(fetchZipProgress, 1000);

    return () => clearInterval(interval);
  }, [zipId, onHide]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!progress.isCompleted) {
        onHide();
      }
    }, 8000);

    return () => clearTimeout(timer);
  }, [progress.isCompleted, onHide]);

  const formatRemainingTime = (remainingTime) => {
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = Math.floor(remainingTime % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`zip-status ${theme}`}>
      {!progress.isCompleted && (
        <>
          <span>Se arhivează fișierele...</span>
          {remainingTime !== null && (
            <span>Timp rămas estimat: {formatRemainingTime(remainingTime)}</span>
          )}
          <div className="zip-bar-container">
            <div className="zip-bar zip-bar-progress" style={{ width: `${zipPercentage}%` }}></div>
          </div>
          <span>{zipPercentage.toFixed(2)}% Procesat</span>
        </>
      )}

      {!progress.isCompleted && remainingTime === null && (
        <span>Timp rămas estimat: Necunoscut</span>
      )}

      {progress.isCompleted && (
        <div>
          <div className="zip-bar-container">
            <div className="zip-bar zip-bar-complete" style={{ width: '100%' }}></div>
          </div>
          <span>Arhivare finalizată!</span>
        </div>
      )}
    </div>
  );
};

export default ZipStatus;