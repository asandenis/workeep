import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './DownloadStatus.sass';
import { ThemeContext } from '../../../../App';

const DownloadStatus = ({ filePath, fileName }) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const [downloadPercentage, setDownloadPercentage] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState(null);
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    const fetchDownloadProgress = async () => {
      try {
        const response = await axios.get('http://localhost:3002/download-progress', {
          params: { path: filePath },
        });
        console.log('Progress response:', response.data);
        const progress = response.data;
        const fileSize = progress.totalSize;
        const bytesDownloaded = progress.bytesDownloaded;
        const downloadSpeed = progress.downloadSpeed;

        if (downloadSpeed !== null && downloadSpeed !== 0) {
          setDownloadSpeed(downloadSpeed);
        }

        if (!isNaN(downloadSpeed) && downloadSpeed !== 0) {
          const remainingBytes = fileSize - bytesDownloaded;
          const remainingTimeInSeconds = remainingBytes / downloadSpeed;
          console.log('Remaining time:', remainingTimeInSeconds);
          setRemainingTime(remainingTimeInSeconds);
        } else {
          console.log('Invalid download speed or NaN.');
          setRemainingTime(null);
        }

        if (fileSize > 0) {
          const percentage = (bytesDownloaded / fileSize) * 100;
          setDownloadPercentage(percentage);
          if (progress.isDownloaded) {
            setDownloadComplete(true);
            setRemainingTime(null);
          }
        }
      } catch (err) {
        console.error('Error fetching download progress:', err);
      } finally {
        setTimeout(() => {
          setDownloadSpeed(null);
        }, 4000);
      }
    };

    const interval = setInterval(fetchDownloadProgress, 1000);

    return () => clearInterval(interval);
  }, [filePath]);

  const formatRemainingTime = (remainingTime) => {
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = Math.floor((remainingTime % 60));
    console.log('Formatting remaining time:', hours, minutes, seconds);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`download-status ${theme}`}>
      <span>Se descarcă: {fileName}</span>
      
      {remainingTime !== null && (
        <span>Timp rămas estimat: {formatRemainingTime(remainingTime)}</span>
      )}

      {downloadPercentage > 0 && downloadPercentage < 100 && remainingTime !== null && (
        <div>
          <div className="download-bar-container">
            <div className="download-bar download-bar-progress" style={{ width: `${downloadPercentage}%` }}></div>
          </div>
          <span>{downloadPercentage.toFixed(2)}% Descărcat</span>
        </div>
      )}

      {downloadComplete && (
        <div>
          <div className="download-bar-container">
            <div className="download-bar download-bar-complete" style={{ width: '100%' }}></div>
          </div>
          <span>Descărcare finalizată!</span>
        </div>
      )}

      {!downloadComplete && remainingTime === null && downloadSpeed === null && (
        <span>Timp rămas estimat: Necunoscut</span>
      )}
    </div>
  );
};

export default DownloadStatus;