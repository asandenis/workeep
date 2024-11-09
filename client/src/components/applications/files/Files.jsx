import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import LoadingModal from '../../LoadingModal';
import Alert from '../../Alert';
import Notification from '../../Notification';
import DownloadStatus from './components/DownloadStatus';
import UploadStatus from './components/UploadStatus';
import ZipStatus from './components/ZipStatus';
import './Files.sass';
import fileIcon from '../../../media/img/fileIcons/file-icon.png';
import folderIcon from '../../../media/img/fileIcons/folder-icon.png';
import recycleBinIcon from '../../../media/img/fileIcons/recycle-icon.png';
import { ThemeContext } from '../../../App';

function Files({ userId, userSupervisor, pathSupervisors, notifications, removeNotification }) {
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState('/');
  const [newName, setNewName] = useState('');
  const [renameItem, setRenameItem] = useState(null);
  const fileInputRef = useRef(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [showRenameButton, setShowRenameButton] = useState(false);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [showZipDownloadButton, setShowZipDownloadButton] = useState(false);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [showPasteButton, setShowPasteButton] = useState(false);
  const [showMoveButton, setShowMoveButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedItems, setCopiedItems] = useState(false);
  const [copiedPath, setCopiedPath] = useState('');
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [downloadingFileName, setDownloadingFileName] = useState(null);
  const [shouldFetch, setShouldFetch] = useState(false);
  const { isDarkMode } = useContext(ThemeContext);
  const [alertMessage, setAlertMessage] = useState('');
  const theme = isDarkMode ? 'dark' : 'light';
  const [uploadFileName, setUploadFileName] = useState(null);
  const [zipId, setZipId] = useState(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectedItems.length > 0 && !event.target.closest('.files-grid-item')) {
        setSelectedItems([]);
        setLastSelectedIndex(null);
        setShowRenameButton(false);
        setShowDownloadButton(false);
        setShowZipDownloadButton(false);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedItems]);

  useEffect(() => {
    handleListClick();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.post('http://localhost:3002/setCopiedItems');
        if(response.data !== 'false') {
          setCopiedPath(response.data);
          setCopiedItems(true);
        } else {
          setCopiedItems(false);
        }
      } catch (err) {
        console.error(err);
        setAlertMessage('A intervenit o eroare la copierea fișierelor');
      }
    };
  
    fetchData();
  }, []);  

  useEffect(() => {
    const hasFolderSelected = selectedItems.some(item => item.type === 'd');
    const hasMultipleItemsSelected = selectedItems.length > 1;

    setShowRenameButton(selectedItems.length === 1);
    setShowDownloadButton(selectedItems.length === 1 && selectedItems[0].type !== 'd');
    setShowZipDownloadButton(hasFolderSelected || hasMultipleItemsSelected);
    setShowDeleteButton(selectedItems.length > 0);
    setShowCopyButton(selectedItems.length > 0);
    setShowMoveButton(selectedItems.length === 0 && copiedItems && copiedPath !== false && copiedPath !== pathSupervisors + path && copiedPath !== pathSupervisors + path + '/');
    setShowPasteButton(selectedItems.length === 0 && copiedItems && copiedPath !== false);
  }, [selectedItems, copiedItems, copiedPath]);

  const handleKeyDown = (event) => {
    if (renameItem !== null) {
      return;
    } else {
      if (event.key === 'Delete') {
        handleDeleteButtonClick();
      } else if ((event.ctrlKey && event.key === 'c') || (event.ctrlKey && event.key === 'C')) {
        if (selectedItems.length > 0) {
          handleCopyButtonClick();
        }
      } else if ((event.ctrlKey && event.key === 'v') || (event.ctrlKey && event.key === 'V')) {
        if (selectedItems.length === 0 && copiedItems && copiedPath !== false) {
          handlePasteButtonClick();
        }
      } else if ((event.ctrlKey && event.key === 'm') || (event.ctrlKey && event.key === 'M')) {
        if (selectedItems.length === 0 && copiedItems && copiedPath !== false && copiedPath !== path) {
          handleMoveButtonClick();
        }
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        if (selectedItems.length > 0) {
          const lastIndex = files.findIndex(item => item === selectedItems[selectedItems.length - 1]);
          let newIndex;
          if (event.key === 'ArrowRight') {
            newIndex = (lastIndex + 1) % files.length;
          } else {
            newIndex = (lastIndex - 1 + files.length) % files.length;
          }
    
          if (event.ctrlKey || event.shiftKey) {
            const selectedItem = files[newIndex];
            const selectedIndex = selectedItems.findIndex(item => item === selectedItem);
    
            if (selectedIndex === -1) {
              setSelectedItems([...selectedItems, selectedItem]);
            } else {
              const updatedSelectedItems = [...selectedItems];
              updatedSelectedItems.splice(selectedIndex, 1);
              setSelectedItems(updatedSelectedItems);
            }
            if (event.shiftKey && selectedItems.length > 1) {
              const firstSelectedIndex = files.findIndex(item => item === selectedItems[0]);
              const start = Math.min(firstSelectedIndex, newIndex);
              const end = Math.max(firstSelectedIndex, newIndex);
              const newSelectedItems = files.slice(start, end + 1);
              setSelectedItems(newSelectedItems);
            }
          } else {
            setSelectedItems([files[newIndex]]);
          }
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItems, copiedItems, copiedPath]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const actualPath = pathSupervisors + path;
      const response = await axios.post('http://localhost:3002/list', { path: actualPath });
      setFiles(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFetch) {
      fetchFiles();
      setShouldFetch(false);
    }
  }, [shouldFetch]);

  const handlePathChange = async (e) => {
    if (e.key === 'Enter') {
      let newPath = e.target.value;

      newPath = newPath.replace(/\./g, '');

      while (newPath.startsWith(' ') || newPath.startsWith('/')) {
        newPath = newPath.slice(1);
      }

      while (newPath.endsWith(' ') || newPath.endsWith('/')) {
        newPath = newPath.slice(0, -1);
      }

      newPath = '/' + newPath;
  
      setPath(newPath);
      setSelectedItems([]);
      
      setShouldFetch(true);
    }
  };

  const handleListClick = () => {
    fetchFiles();
  };

  const handleItemClick = async (item) => {
    if (item.type === 'd') {
      let partialPath = path === '/' ? `/${item.name}` : `${path}/${item.name}`;
      let newPath = `${pathSupervisors}/${partialPath}`;
      setPath(partialPath);
      try {
        setLoading(true);
        setSelectedItems([]);
        const response = await axios.post('http://localhost:3002/list', { path: newPath });
        setFiles(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      handleDownload(`${pathSupervisors}/${path}/${item.name}`, `${item.name}`);
    }
  };

  const handleDownload = async (filePath, itemName) => {
    try {
      setLoading(true);
      setDownloadingFile(filePath);
      setDownloadingFileName(itemName);
      const response = await axios.get('http://localhost:3002/download', {
        params: { path: filePath },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filePath.split('/').pop());
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setDownloadingFile(null);
        setDownloadingFileName(null);
      }, "3000");
    }
  };

  const handleBackClick = async () => {
    let parentPath = path.split('/').slice(0, -1).join('/');
    if (parentPath === '') {
      parentPath = pathSupervisors + '/';
      setPath('/');
    } else {
      setPath(parentPath);
      parentPath = pathSupervisors + '/' + parentPath;
    }
    try {
      setLoading(true);
      setSelectedItems([]);
      const response = await axios.post('http://localhost:3002/list', { path: parentPath });
      setFiles(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }; 

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = async (e, currentPath="") => {
    e.preventDefault();
    setDragging(false);
  
    let items = Array.from(e.dataTransfer.items);
    currentPath=path;
    await processItems(items, currentPath);
  }
  
  const processItems = async (items, currentPath) => {
    let entriesItems = [];
    for (let i=0; i<items.length; i++) {
      const itemEntry = items[i];
  
      if(itemEntry.webkitGetAsEntry) {
        const item = itemEntry.webkitGetAsEntry();
        entriesItems.push(item);
      }
    }
    await upload(entriesItems, currentPath);
  }

  const upload = async (items, currentPath) => {
    while (items.length > 0 && items[0] !== null) {
      if (items[0].isFile) {
        await new Promise((resolve, reject) => {
          items[0].file(async file => {
            const newName = file.name;
            let newNameParts = newName.split('.');
            const existingFiles = files.filter(item => item.type === 'f').map(item => item.name);
            let baseName = newNameParts.slice(0, -1).join('.');
            let extension = newNameParts[newNameParts.length - 1];
            let finalFileName = newName;
            let counter = 1;
  
            while (existingFiles.includes(finalFileName)) {
              finalFileName = `${baseName} (version ${counter}).${extension}`;
              counter++;
            }
  
            const formData = new FormData();
            const renamedFile = new File([file], finalFileName, { type: file.type });
            formData.append('file', renamedFile);
            const actualPath = pathSupervisors + currentPath;
            formData.append('path', actualPath);
            try {
              setLoading(true);
              setUploadFileName(file.name);
              const response = await axios.post('http://localhost:3002/upload', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data'
                }
              });
              fetchFiles();
              resolve();
            } catch (error) {
              console.error('Error uploading file:', error);
              reject(error);
            } finally {
              setLoading(false);
            }
          });
        });
      } else if (items[0].isDirectory) {
        const newName = items[0].name;
        const existingFolders = files.filter(item => item.type === 'd').map(item => item.name);
        let finalFolderName = newName;
        let counter = 1;
        while (existingFolders.includes(finalFolderName)) {
          finalFolderName = `${finalFolderName} (version ${counter})`;
          counter++;
        }
        const newPath = currentPath + "/" + finalFolderName;
        const directoryReader = items[0].createReader();
        const nestedEntries = await new Promise((resolve, reject) => {
          directoryReader.readEntries(
            (entries) => resolve(entries),
            (error) => reject(error)
          );
        });
        try {
          setLoading(true);
          await axios.post('http://localhost:3002/create-folder', { path: currentPath, folderName: finalFolderName });
          await upload(nestedEntries, newPath);
          fetchFiles();
        } catch (error) {
          console.error('Error creating folder or uploading nested entries:', error);
        } finally {
          setLoading(false);
        }
      }
      items = items.slice(1);
    }
  };

  const handleDeleteClick = async (item) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${item.name}?`);
    if (confirmDelete) {
      try {
        setLoading(true);
        if (item.type === 'd') {
          await axios.delete('http://localhost:3002/deletepath', { data: { path: `${pathSupervisors}/${path}/${item.name}` } });
        } else {
          await axios.delete('http://localhost:3002/delete-file', { data: { path: `${pathSupervisors}/${path}/${item.name}` } });
        }
        fetchFiles();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRenameClick = (item, e, index) => {
    e.stopPropagation();
    setRenameItem(item);
    setNewName(item.name);
    handleItemSelect(item, e.ctrlKey, e.shiftKey, index);
  };

  const handleRenameInputChange = (e) => {
    setNewName(e.target.value);
  };

  const handleRenameSubmit = async () => {
    if (newName.trim() !== '') {
      if (newName !== renameItem.name) {
        if (selectedItems[0].type === 'f') {
          let newNameParts = newName.split('.');
          if (newNameParts.length === 1) {
            setRenameItem(null);
            setNewName('');
          } else {
            try {
              setLoading(true);
  
              const existingFiles = files.filter(item => item.type === 'f').map(item => item.name);
              let baseName = newNameParts.slice(0, -1).join('.');
              let extension = newNameParts[newNameParts.length - 1];
              let finalFileName = newName;
              let counter = 1;
  
              while (existingFiles.includes(finalFileName)) {
                finalFileName = `${baseName} (version ${counter}).${extension}`;
                counter++;
              }
  
              await axios.post('http://localhost:3002/rename', { oldPath: `${pathSupervisors}/${path}/${renameItem.name}`, newPath: `${pathSupervisors}/${path}/${finalFileName}` });
              fetchFiles();
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }
        } else if (selectedItems[0].type === 'd') {
          try {
            setLoading(true);
  
            const existingFolders = files.filter(item => item.type === 'd').map(item => item.name);
            let finalFolderName = newName;
            let counter = 1;
  
            while (existingFolders.includes(finalFolderName)) {
              finalFolderName = `${newName} (version ${counter})`;
              counter++;
            }
  
            await axios.post('http://localhost:3002/rename', { oldPath: `${pathSupervisors}/${path}/${renameItem.name}`, newPath: `${pathSupervisors}/${path}/${finalFolderName}` });
            fetchFiles();
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }
      }
      setRenameItem(null);
      setNewName('');
    } else {
      setRenameItem(null);
      setNewName('');
    }
  };

  const handleRenameBlur = async () => {
    if (newName.trim() !== '') {
      if (newName !== renameItem.name) {
        const confirmRename = window.confirm(`Vrei să redenumești din ${renameItem.name} în ${newName}?`);
        if (confirmRename) {
          await handleRenameSubmit();
        } else {
          setRenameItem(null);
          setNewName('');
        }
      } else {
        setRenameItem(null);
        setNewName('');
      }
    } else {
      setRenameItem(null);
      setNewName('');
    }
  };

  const handleRenameKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      handleRenameSubmit();
    }
  };

  const handleSelectKeyDown = async (e, item) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      if (selectedItems.length === 1) {
        handleItemClick(item);
      } else if (selectedItems.length > 1) {
        handleZipDownloadButtonClick();
      }
    }
  };

  const handleItemSelect = (item, ctrlPressed, shiftPressed, index) => {
    if (!ctrlPressed && !shiftPressed) {
      setSelectedItems([item]);
      setLastSelectedIndex(index);
      setShowRenameButton(selectedItems.length === 1);
    } else if (ctrlPressed) {
      const selectedIndex = selectedItems.findIndex((selectedItem) => selectedItem === item);
      if (selectedIndex === -1) {
        setSelectedItems([...selectedItems, item]);
        setLastSelectedIndex(index);
        setShowRenameButton(false);
      } else {
        const updatedSelectedItems = [...selectedItems];
        updatedSelectedItems.splice(selectedIndex, 1);
        setSelectedItems(updatedSelectedItems);
        setLastSelectedIndex(null);
        setShowRenameButton(updatedSelectedItems.length === 1);
      }
    } else if (shiftPressed && lastSelectedIndex !== null) {
      const start = Math.min(index, lastSelectedIndex);
      const end = Math.max(index, lastSelectedIndex);
      const newSelectedItems = files.slice(start, end + 1);
      setSelectedItems(newSelectedItems);
      setShowRenameButton(false);
    }
  };

  const handleRenameButtonClick = () => {
    setRenameItem(selectedItems[0]);
    setNewName(selectedItems[0].name);
  };

  const handleDeleteButtonClick = async () => {
    const confirmDelete = window.confirm(`Ești sigur că vrei să ștergi următoarele ${selectedItems.length} element(e)?`);
    if (confirmDelete) {
      try {
        setLoading(true);
        for (const [index, item] of selectedItems.entries()) {
          await deleteItem(item);
          if (index < selectedItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        setSelectedItems([]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };    
  
  const deleteItem = async (item) => {
    try {
      setLoading(true);
      if (item.type === 'd') {
        await axios.delete('http://localhost:3002/deletepath', { data: { path: `${pathSupervisors}/${path}/${item.name}` } });
      } else {
        await axios.delete('http://localhost:3002/delete-file', { data: { path: `${pathSupervisors}/${path}/${item.name}` } });
      }
      fetchFiles();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyButtonClick = async () => {
    try {
      setLoading(true);
      await axios.post('http://localhost:3002/copy', {
        selectedItems: selectedItems,
        path: pathSupervisors + '/' + path,
      });
      setCopiedItems(true);
      setCopiedPath(pathSupervisors + '/' + path);
    } catch (err) {
      console.error(err);
      setAlertMessage('A intervenit o eroare la copierea fișierelor');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteButtonClick = async () => {
    try {
      setLoading(true);
      await axios.post('http://localhost:3002/paste', {
        path: pathSupervisors + '/' + path,
      });
      setCopiedItems(false);
      setCopiedPath(false);
      fetchFiles();
    } catch (err) {
      console.error(err);
      setAlertMessage('A intervenit o eroare la lipirea fișierelor');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveButtonClick = async () => {
    try {
      setLoading(true);
      const pathToMove = pathSupervisors + '/' + path;
      await axios.post('http://localhost:3002/move', {
        path: pathToMove,
      });
      setCopiedItems(false);
      setCopiedPath(false);
      fetchFiles();
    } catch (err) {
      console.error(err);
      setAlertMessage('A intervenit o eroare la mutarea fișierelor');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadButtonClick = () => {
    handleDownload(`${pathSupervisors}/${path}/${selectedItems[0].name}`, `${selectedItems[0].name}`);
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (folderName === null) return;
  
    const trimmedFolderName = folderName.trim();
  
    if (!trimmedFolderName) {
      setAlertMessage('Numele folder-ului nu poate fi gol și nu poate conține doar spații');
      return;
    }

    if (trimmedFolderName.includes('/')) {
      setAlertMessage('Numele folder-ului nu poate conține \'/\'');
      return;
    }

    if (trimmedFolderName.includes('.')) {
      setAlertMessage('Numele folder-ului nu poate conține \'.\'');
      return;
    }
  
    try {
      setLoading(true);
      const existingFolders = files.filter(item => item.type === 'd').map(item => item.name);
      let finalFolderName = trimmedFolderName;
      let counter = 1;
  
      while (existingFolders.includes(finalFolderName)) {
        finalFolderName = `${trimmedFolderName} (version ${counter})`;
        counter++;
      }
  
      await axios.post('http://localhost:3002/create-folder', { path: pathSupervisors + '/' + path, folderName: finalFolderName });
      fetchFiles();
    } catch (err) {
      console.error(err);
      setAlertMessage('A intervenit o eroare la crearea folder-ului');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (event) => {
    const fileList = event.target.files;
    const filesArray = Array.from(fileList);
    const dataTransferItems = filesArray.map(file => {
      return {
        kind: 'file',
        type: file.type,
        name: file.name,
        file: file
      };
    });

    await clickUpload(dataTransferItems);
};

const clickUpload = async (items) => {
  if(items.length > 0) {
    const file = items[0].file;
    const newName = file.name;
    let newNameParts = newName.split('.');
    const existingFiles = files.filter(item => item.type === 'f').map(item => item.name);
    let baseName = newNameParts.slice(0, -1).join('.');
    let extension = newNameParts[newNameParts.length - 1];
    let finalFileName = newName;
    let counter = 1;

    while (existingFiles.includes(finalFileName)) {
      finalFileName = `${baseName} (version ${counter}).${extension}`;
      counter++;
    }

    const formData = new FormData();
    const renamedFile = new File([file], finalFileName, { type: file.type });
    formData.append('file', renamedFile);
    formData.append('path', pathSupervisors + '/' + path);

    try {
      setLoading(true);
      setUploadFileName(file.name);
      const response = await axios.post('http://localhost:3002/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        fetchFiles();
    } catch (error) {
        console.error('Error uploading file:', error);
    } finally {
        setLoading(false);
    }
    await clickUpload(items.slice(1));
  }
}

const handleZipDownloadButtonClick = async () => {
  try {
    setLoading(true);
    const zipId = Date.now().toString();
    setZipId(zipId);
    const response = await axios.post('http://localhost:3002/zip-download', {
      selectedItems: selectedItems,
      path: pathSupervisors + '/' + path,
      zipId: zipId
    }, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const zipName = 'fișiere_arhivate_' + zipId + '.zip';
    link.setAttribute('download', zipName);
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error('Error zipping and downloading:', error);
  } finally {
    setLoading(false);
    setTimeout(() => setZipId(null), 15000);
  }
};

const closeAlert = () => {
  setAlertMessage('');
};

const hideUpload = () => {
  setUploadFileName(null);
}

  return (
    <div className="Files" onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {loading && <LoadingModal />}
      {alertMessage !== '' && (
        <Alert onClose={closeAlert} message={alertMessage}/>
      )}
      {downloadingFile && downloadingFileName && <DownloadStatus filePath={downloadingFile} fileName={downloadingFileName} />}
      {uploadFileName && <UploadStatus fileName={uploadFileName} onHide={hideUpload}/>}
      {zipId && <ZipStatus zipId={zipId} onHide={() => setZipId(null)} />}
      { userId !== null && userSupervisor !== 'unknown' && pathSupervisors !== 'unknown' ? (
        <>
          <input className={`files-input ${theme}`} type="text" value={path} onKeyDown={handlePathChange} onChange={(e) => setPath(e.target.value)} />
          <button className='files-button' onClick={handleListClick}>Listează fișierele</button>
          <button className='files-button' onClick={handleBackClick}>Înapoi</button>
          <button className='files-button' onClick={handleUploadButtonClick}>Încarcă</button>
          <input className={`files-input ${theme}`} type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleFileInputChange} />
          <button className='files-button' onClick={handleCreateFolder}>Crează folder</button>
          {showRenameButton && <button className='files-button' onClick={handleRenameButtonClick}>Redenumește</button>}
          {showDownloadButton && <button className='files-button' onClick={handleDownloadButtonClick}>Descarcă</button>}
          {showZipDownloadButton && <button className='files-button' onClick={handleZipDownloadButtonClick}>Zip & Descarcă</button>}
          {showDeleteButton && <button className='files-button' onClick={handleDeleteButtonClick}>Șterge</button>}
          {showCopyButton && <button className='files-button' onClick={handleCopyButtonClick}>Copiază</button>}
          {showPasteButton && <button className='files-button' onClick={handlePasteButtonClick}>Lipește</button>}
          {showMoveButton && <button className='files-button' onClick={handleMoveButtonClick}>Mută aici</button>}
          <div className="files-grid-container">
            {files.map((item, index) => (
              <div className={`files-grid-item ${selectedItems.includes(item) ? 'selected' : ''} ${theme}`} onClick={(e) => handleItemSelect(item, e.ctrlKey, e.shiftKey, index)} onKeyDown={(e) => handleSelectKeyDown(e, item)} tabIndex={0}>
                <div className="files-grid-item-content">
                  <div
                    className="files-grid-item-info"
                    onDoubleClick={() => handleItemClick(item, index)}
                    onDragStart={(e) => e.preventDefault()}
                  >
                    {item.type === 'd' ? (
                      <img src={folderIcon} alt="Folder" />
                    ) : (
                      <img
                        src={fileIcon}
                        alt="File"
                        onDragStart={(e) => e.preventDefault()}
                      />
                    )}
                    {renameItem === item ? (
                      <input
                        className={`files-input ${theme}`}
                        type="text"
                        value={newName}
                        onChange={handleRenameInputChange}
                        onBlur={handleRenameBlur}
                        onKeyDown={handleRenameKeyDown}
                        autoFocus
                      />
                    ) : (
                      <span onClick={(e) => handleRenameClick(item, e, index)}>{item.name}</span>
                    )}
                  </div>
                  <div className="files-grid-item-delete">
                    <img
                      src={recycleBinIcon}
                      alt="Recycle Bin"
                      className="files-recycle-bin"
                      onClick={() => handleDeleteClick(item)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="notifications-container">
            {notifications.map((notif) => (
              <Notification key={notif.id} id={notif.id} message={notif.message} onClose={removeNotification} />
            ))}
          </div>
        </>
      ) : (
        <h1>Nu s-au putut încărca informațiile necesare!</h1>
      )}
    </div>
  );
}

export default Files;