import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './UploadStatus.sass';
import { ThemeContext } from '../../../../App';

const UploadStatus = ({ fileName, onHide }) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const { isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    let noUpdateTimeout;
    const startTimestamp = Date.now();

    const fetchUploadProgress = async () => {
      try {
        const response = await axios.get('http://localhost:3002/upload-progress', {
          params: { fileName },
        });
        const progress = response.data;
        const fileSize = progress.totalSize;
        const bytesUploaded = progress.bytesUploaded;
        const uploadSpeed = progress.uploadSpeed;

        if (uploadSpeed !== null && uploadSpeed !== 0) {
          setUploadSpeed(uploadSpeed);
        }

        if (!isNaN(uploadSpeed) && uploadSpeed !== 0) {
          const remainingBytes = fileSize - bytesUploaded;
          const remainingTimeInSeconds = remainingBytes / uploadSpeed;
          setRemainingTime(remainingTimeInSeconds);
        } else {
          setRemainingTime(null);
        }

        if (fileSize > 0) {
          const percentage = (bytesUploaded / fileSize) * 100;
          setUploadPercentage(percentage);
          if (progress.isUploaded) {
            setUploadComplete(true);
            setRemainingTime(null);

            clearInterval(interval);
            noUpdateTimeout = setTimeout(() => {
              onHide();
            }, 3000);
          } else {
            clearTimeout(noUpdateTimeout);
          }
        }
      } catch (err) {
        console.error('Error fetching upload progress:', err);
      } finally {
        setTimeout(() => {
          setUploadSpeed(null);
        }, 4000);

        if (Date.now() - startTimestamp >= 8000) {
          clearInterval(interval);
          onHide();
        }
      }
    };

    const interval = setInterval(fetchUploadProgress, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(noUpdateTimeout);
    };
  }, [fileName, onHide]);

  const formatRemainingTime = (remainingTime) => {
    const hours = Math.floor(remainingTime / 3600);
    const minutes = Math.floor((remainingTime % 3600) / 60);
    const seconds = Math.floor((remainingTime % 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`upload-status ${theme}`}>
      <span>Se încarcă: {fileName}</span>

      {remainingTime !== null && (
        <span>Timp rămas estimat: {formatRemainingTime(remainingTime)}</span>
      )}

      {uploadPercentage > 0 && uploadPercentage < 100 && remainingTime !== null && (
        <div>
          <div className="upload-bar-container">
            <div className="upload-bar upload-bar-progress" style={{ width: `${uploadPercentage}%` }}></div>
          </div>
          <span>{uploadPercentage.toFixed(2)}% Încărcat</span>
        </div>
      )}

      {uploadComplete && (
        <div>
          <div className="upload-bar-container">
            <div className="upload-bar upload-bar-complete" style={{ width: '100%' }}></div>
          </div>
          <span>Încărcare finalizată!</span>
        </div>
      )}

      {!uploadComplete && remainingTime === null && uploadSpeed === null && (
        <span>Timp rămas estimat: Necunoscut</span>
      )}
    </div>
  );
};

export default UploadStatus;