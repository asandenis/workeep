const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const ftp = require('basic-ftp');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const { promisify } = require('util');
const { constrainedMemory } = require('process');
const { folder } = require('jszip');
const writeFileAsync = promisify(fs.writeFile);
const { Readable } = require('stream');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const ftpConfig = JSON.parse(fs.readFileSync('config/ftpConfig.json', 'utf8'));

let client;

let copiedItems = [];

let basePath = '/Main';

const createFtpClient = async () => {
  client = new ftp.Client();
  await client.access(ftpConfig);
};

const closeFtpClient = async () => {
  if (client && client.close) {
    await client.close();
  }
};

const reconnectInterval = 60 * 60 * 1000;
setInterval(async () => {
  try {
    await closeFtpClient();
    await createFtpClient();
    console.log('FTP connection re-established');
  } catch (error) {
    console.error('Error reconnecting to FTP server:', error);
  }
}, reconnectInterval);

app.post('/list', async (req, res) => {
  const receivedPath = req.body.path;
  const path = basePath+receivedPath;
  console.log('Listed path: ' + path);
  try {
    const client = new ftp.Client();
    await client.access(ftpConfig);

    const fileList = await client.list(path);
    const formattedList = fileList.map(item => ({
      name: item.name,
      type: item.isDirectory ? 'd' : 'f'
    }));

    await client.close();

    res.json(formattedList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error listing directory' });
  }
});

const downloadProgress = {};

app.get('/download', async (req, res) => {
  const receivedPath = req.query.path;
  console.log(receivedPath);
  filePath = basePath +  '/' + receivedPath;
  try {
    const client = new ftp.Client();
    await client.access(ftpConfig);

    const fileInfo = await client.size(filePath);
    const fileSize = fileInfo;

    downloadProgress[filePath] = { totalSize: fileSize, bytesDownloaded: 0, downloadSpeed: 0, isDownloaded: false };

    let lastBytesOverall = 0;
    let lastTimestamp = Date.now();

    client.trackProgress((info) => {
      const currentTimestamp = Date.now();
      const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
      const bytesDelta = info.bytesOverall - lastBytesOverall;
      
      const downloadSpeed = bytesDelta / deltaTime;

      downloadProgress[filePath].bytesDownloaded = info.bytesOverall;
      downloadProgress[filePath].downloadSpeed = downloadSpeed;
      
      if (downloadProgress[filePath].bytesDownloaded >= downloadProgress[filePath].totalSize) {
        downloadProgress[filePath].isDownloaded = true;
      }

      lastBytesOverall = info.bytesOverall;
      lastTimestamp = currentTimestamp;
    });

    await client.downloadTo(res, filePath);

    await client.close();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error downloading file' });
  } finally {
    delete downloadProgress[filePath];
  }
});

app.get('/download-progress', (req, res) => {
  const receivedPath = req.query.path;
  filePath = basePath +  '/' + receivedPath;
  const progress = downloadProgress[filePath] || { totalSize: 0, bytesDownloaded: 0, downloadSpeed: 0, isDownloaded: false };
  res.json(progress);
});

const upload = multer({ dest: 'uploads/' });

const ftpPool = [];
const maxPoolSize = 5;

const getFtpClient = async () => {
  if (ftpPool.length < maxPoolSize) {
    const client = new ftp.Client();
    await client.access(ftpConfig);
    ftpPool.push(client);
    return client;
  } else {
    return ftpPool[Math.floor(Math.random() * ftpPool.length)];
  }
};

const closeFtpPool = async () => {
  for (const client of ftpPool) {
    await client.close();
  }
  ftpPool.length = 0;
};

const uploadProgress = {};

app.post('/upload', upload.single('file'), async (req, res) => {
  const fileName = req.file ? req.file.originalname : null;

  try {
    const client = await getFtpClient();

    const filePath = req.file ? req.file.path : null;
    const receivedPath = req.body.path;
    const newPath = basePath + receivedPath;
    console.log(filePath);
    console.log(fileName);
    console.log(newPath);

    if (filePath && fileName) {
      const totalSize = fs.statSync(filePath).size;
      uploadProgress[fileName] = { totalSize, bytesUploaded: 0, uploadSpeed: 0, isUploaded: false };

      let lastBytesOverall = 0;
      let lastTimestamp = Date.now();

      client.trackProgress((info) => {
        const currentTimestamp = Date.now();
        const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
        const bytesDelta = info.bytesOverall - lastBytesOverall;

        const uploadSpeed = bytesDelta / deltaTime;

        uploadProgress[fileName].bytesUploaded = info.bytesOverall;
        uploadProgress[fileName].uploadSpeed = uploadSpeed;

        if (uploadProgress[fileName].bytesUploaded >= uploadProgress[fileName].totalSize) {
          uploadProgress[fileName].isUploaded = true;
        }

        lastBytesOverall = info.bytesOverall;
        lastTimestamp = currentTimestamp;
      });

      await client.uploadFrom(filePath, `${newPath}/${fileName}`);
      console.log('File uploaded successfully');
      fs.unlinkSync(filePath);

      uploadProgress[fileName].isUploaded = true;
    } else {
      console.log('No file uploaded');
    }

    res.status(200).send('File(s) uploaded successfully');
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file(s)');
  } finally {
    if (fileName) {
      setTimeout(() => {
        delete uploadProgress[fileName];
      }, 5000);
    }
  }
});

app.get('/upload-progress', (req, res) => {
  const fileName = req.query.fileName;
  const progress = uploadProgress[fileName] || { totalSize: 0, bytesUploaded: 0, uploadSpeed: 0, isUploaded: false };
  res.json(progress);
});

process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await closeFtpPool();
  process.exit();
});

app.delete('/delete', async (req, res) => {
  const receivedPath = req.body.path;
  const pathToDelete = basePath+receivedPath;
  try {
    if (!client) {
      await createFtpClient();
    }

    if (ftpBusy) {
      return res.status(500).json({ error: 'FTP operation in progress' });
    }

    ftpBusy = true;

    await deletePathRecursively(pathToDelete);

    ftpBusy = false;

    res.status(200).send('File or directory deleted successfully');
  } catch (err) {
    console.error(err);
    ftpBusy = false;
    res.status(500).json({ error: 'Error deleting file or directory' });
  }
});

async function deletePathRecursively(pathToDelete) {
  try {
    const fileList = await client.list(pathToDelete);
    for (const item of fileList) {
      const itemPath = `${pathToDelete}/${item.name}`;
      if (item.isDirectory) {
        await deletePathRecursively(itemPath);
      } else {
        await client.remove(itemPath);
      }
    }
    await client.removeDir(pathToDelete);
    console.log(`Deleted directory: ${pathToDelete}`);
  } catch (error) {
    console.error(`Error deleting path ${pathToDelete}:`, error);
    throw error;
  }
}

app.delete('/delete-file', async (req, res) => {
  const receivedPath = req.body.path;
  const pathToDelete = basePath+receivedPath;
  try {
    if (!client) {
      await createFtpClient();
    }
    await client.remove(pathToDelete);
    res.status(200).send('File deleted successfully');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

let ftpBusy = false;

app.delete('/deletepath', async (req, res) => {
  const receivedPath = req.body.path;
  const pathToDelete = basePath+receivedPath;
  try {
    if (!client) {
      await createFtpClient();
    }

    if (ftpBusy) {
      return res.status(500).json({ error: 'FTP operation in progress' });
    }

    ftpBusy = true;

    await deletePathRecursively(pathToDelete);

    ftpBusy = false;

    res.status(200).send('Path deleted successfully');
  } catch (err) {
    console.error(err);
    ftpBusy = false;
    res.status(500).json({ error: 'Error deleting path' });
  }
});

app.post('/rename', async (req, res) => {
  const receivedOldPath = req.body.oldPath;
  const oldPath = basePath+receivedOldPath;
  const receivedNewPath = req.body.newPath;
  const newPath = basePath+receivedNewPath;
  try {
    if (!client) {
      await createFtpClient();
    }

    if (ftpBusy) {
      return res.status(500).json({ error: 'FTP operation in progress' });
    }

    ftpBusy = true;

    await client.rename(oldPath, newPath);

    ftpBusy = false;

    res.status(200).send('File or directory renamed successfully');
  } catch (err) {
    console.error(err);
    ftpBusy = false;
    res.status(500).json({ error: 'Error renaming file or directory' });
  }
});

app.post('/create-folder', async (req, res) => {
  const receivedPath = req.body.path;
  const path = basePath + '/' + receivedPath || basePath;
  const folderName = req.body.folderName;
  
  try {
    if (!client) {
      await createFtpClient();
    }

    const fullPath = path === '/' ? `/${folderName}` : `${path}/${folderName}`;

    await client.ensureDir(fullPath);

    res.status(200).send('Folder created successfully');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating folder' });
  }
});

const zipProgress = {};

app.post('/zip-download', async (req, res) => {
  const selectedItems = req.body.selectedItems;
  const receivedPath = req.body.path;
  const zipId = req.body.zipId;
  const pathToZipAndDownload = receivedPath;

  const client = new ftp.Client();
  await client.access(ftpConfig);

  try {
    const zip = new AdmZip();
    const totalItems = selectedItems.length;
    let processedItems = 0;
    
    const addNestedFilesAndFolders = async (pathToZipAndDownload, relativePath, items) => {
      if (items.length > 0) {
        const item = items[0];
        const nestedItemPath = pathToZipAndDownload + '/' + item.name;
        const nestedRelativePath = relativePath + '/' + item.name;

        if (item.type === 1) {
          const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(nestedItemPath)}`, { responseType: 'arraybuffer' });
          zip.addFile(nestedRelativePath, response.data);
        } else if (item.type === 2) {
          const nestedItemPathDir = basePath + '/' + pathToZipAndDownload + '/' + item.name;
          const folderItems = await client.list(nestedItemPathDir);
          const nestedItems = folderItems.map(fileInfo => ({
            name: fileInfo.name,
            type: fileInfo.type
          }));
          if (nestedItems.length === 0) {
            zip.addFile(nestedRelativePath + "/", Buffer.alloc(0));
          } else {
            await addNestedFilesAndFolders(nestedItemPath, nestedRelativePath, nestedItems);
          }
        }

        const updatedItems = items.slice(1);
        await addNestedFilesAndFolders(pathToZipAndDownload, relativePath, updatedItems);
      }
    };

    const addFilesAndFolders = async (pathToZipAndDownload, items) => {
      if (items.length > 0) {
        const item = items[0];
        const itemPath = pathToZipAndDownload + '/' + item.name;

        if (item.type === 'f') {
          const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(itemPath)}`, { responseType: 'arraybuffer' });
          zip.addFile(item.name, response.data);
        } else if (item.type === 'd') {
          const itemPathDir = basePath + '/' + pathToZipAndDownload + '/' + item.name;
          const folderItems = await client.list(itemPathDir);
          const nestedItems = folderItems.map(fileInfo => ({
            name: fileInfo.name,
            type: fileInfo.type
          }));
          zip.addFile(item.name + "/", Buffer.alloc(0));
          await addNestedFilesAndFolders(itemPath, item.name, nestedItems);
        }

        processedItems += 1;
        zipProgress[zipId] = {
          totalItems: totalItems,
          processedItems: processedItems,
          isCompleted: false,
        };

        const updatedItems = items.slice(1);
        await addFilesAndFolders(pathToZipAndDownload, updatedItems);
      }
    };

    await addFilesAndFolders(pathToZipAndDownload, selectedItems);

    const zipBuffer = zip.toBuffer();
    zipProgress[zipId].isCompleted = true;
    res.status(200).send(zipBuffer);
  } catch (error) {
    console.error('Error zipping and downloading:', error);
    res.status(500).json({ error: 'Error zipping and downloading' });
  }
});

app.get('/zip-progress', (req, res) => {
  const zipId = req.query.zipId;
  const progress = zipProgress[zipId] || { totalItems: 0, processedItems: 0, isCompleted: false };
  res.json(progress);
});

app.post('/copy', async (req, res) => {
  const selectedItems = req.body.selectedItems;
  const receivedPath = req.body.path;
  const path = receivedPath;
  console.log(path);

  try {
    if (copiedItems.length > 0) {
      copiedItems = [];
    }

    copiedItems.push(path);
    for (item of selectedItems) {
      copiedItems.push(item);
    }
    console.log(copiedItems);

    res.status(200).send('Copied items successfully');
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating folder' });
  }
});

app.post('/setCopiedItems', async (req, res) => {
  try {
    if(copiedItems.length > 0) {
      res.status(200).send(copiedItems[0]);
    } else {
      res.status(200).send('false');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error sending copied items data.' });
  }
});

app.post('/paste', async (req, res) => {
  const receivedPath = req.body.path;
  const newPath = basePath + '/' + receivedPath;
  console.log('newPath: ' + newPath);
  const pastePath = copiedItems[0];
  console.log('pastePath: ' + pastePath);
  const items = copiedItems.slice(1);
  let canPaste = true;

  function verifyPath(item) {
    const itemPath = basePath + '/' + pastePath + '/' + item.name;
    console.log('itemPath:' + itemPath);
    if (itemPath === newPath) {
      canPaste = false;
    }
  }

  items.forEach(verifyPath);

  if (canPaste) {
    const client = new ftp.Client();
    await client.access(ftpConfig);

    try {
      const pasteFilesAndFolders = async (newPath, items) => {

        const checkExistence = async (newPath, itemName, itemType) => {
          let exists = (await client.list(newPath)).some(entry => entry.name === itemName);
          let finalItemName = itemName;
          let counter = 1;
          if (itemType === 'f') {
            let nameParts = itemName.split('.');
            let baseName = nameParts.slice(0, -1).join('.');
            let extension = nameParts[nameParts.length - 1];
            while (exists) {
              finalItemName = `${baseName} (version ${counter}).${extension}`;
              counter++;
              exists = (await client.list(newPath)).some(entry => entry.name === finalItemName);
            }
          } else if (itemType === 'd') {
            while (exists) {
              finalItemName = `${finalItemName} (version ${counter})`;
              counter++;
              exists = (await client.list(newPath)).some(entry => entry.name === finalItemName);
            }
          }

          return finalItemName;
        }

        if (items.length > 0) {
          const item = items[0];
          const itemPath = pastePath + '/' + item.name;
          const itemName = await checkExistence(newPath, item.name, item.type);
          if (item.type === 'f') {
            const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(itemPath)}`, { responseType: 'arraybuffer' });
            const stream = new Readable();
            stream.push(response.data);
            stream.push(null);
            await client.uploadFrom(stream, newPath + '/' + itemName);
          } else if (item.type === 'd') {
            await axios.post('http://localhost:3002/create-folder', { path: receivedPath, folderName: itemName });
            const folderItems = await client.list(basePath + '/' + itemPath);
            const nestedItems = folderItems.map(fileInfo => ({
              name: fileInfo.name,
              type: fileInfo.type
            }));
            console.log(nestedItems);
            const newNestedPath = newPath + '/' + itemName;
            await pasteNestedFilesAndFolders(newNestedPath, itemPath, nestedItems);
          }
          const updatedItems = items.slice(1);
          await pasteFilesAndFolders(newPath, updatedItems);
        }
      }

      const pasteNestedFilesAndFolders = async (newPath, nestedPath, items) => {
        if (items.length > 0) {
          const item = items[0];
          const itemPath = nestedPath + '/' + item.name;
          if (item.type === 1) {
            const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(itemPath)}`, { responseType: 'arraybuffer' });
            const stream = new Readable();
            stream.push(response.data);
            stream.push(null);
            await client.uploadFrom(stream, newPath + '/' + item.name);
          } else if (item.type === 2) {
            const directoryPath = newPath.replace(basePath + '/', '');
            console.log('newPath la nest: ' + newPath);
            console.log('directoryPath: ' + directoryPath);
            await axios.post('http://localhost:3002/create-folder', { path: directoryPath, folderName: item.name });
            const folderItems = await client.list(basePath + '/' + itemPath);
            const nestedItems = folderItems.map(fileInfo => ({
              name: fileInfo.name,
              type: fileInfo.type
            }));
            console.log('Nested items in nested:');
            console.log(nestedItems);
            const newNestedPath = newPath + '/' + item.name;
            await pasteNestedFilesAndFolders(newNestedPath, itemPath, nestedItems);
          }
          const updatedItems = items.slice(1);
          await pasteNestedFilesAndFolders(newPath, nestedPath, updatedItems);
        }
      }

      await pasteFilesAndFolders(newPath, items);

      copiedItems = [];
      res.status(200).send('File(s) pasted succesfully');
    } catch (error) {
      console.error('Error pasting file(s):', error);
      res.status(500).send('Error pasting file(s)');
    }
  } else {
    res.status(500).send('Error pasting file(s)');
  }
});

app.post('/move', async (req, res) => {
  const receivedPath = req.body.path;
  const newPath = basePath + '/' + receivedPath;
  console.log('newPath: ' + newPath);
  const movePath = copiedItems[0];
  console.log('movePath: ' + movePath);
  const items = copiedItems.slice(1);
  let canPaste = true;

  function verifyPath(item) {
    const itemPath = basePath + '/' + movePath + '/' + item.name;
    console.log('itemPath:' + itemPath);
    if (itemPath === newPath) {
      canPaste = false;
    }
  }

  items.forEach(verifyPath);

  if (canPaste) {
    const client = new ftp.Client();
    await client.access(ftpConfig);

    try {
      const moveFilesAndFolders = async (newPath, items) => {

        const checkExistence = async (newPath, itemName, itemType) => {
          let exists = (await client.list(newPath)).some(entry => entry.name === itemName);
          let finalItemName = itemName;
          let counter = 1;
          if (itemType === 'f') {
            let nameParts = itemName.split('.');
            let baseName = nameParts.slice(0, -1).join('.');
            let extension = nameParts[nameParts.length - 1];
            while (exists) {
              finalItemName = `${baseName} (version ${counter}).${extension}`;
              counter++;
              exists = (await client.list(newPath)).some(entry => entry.name === finalItemName);
            }
          } else if (itemType === 'd') {
            while (exists) {
              finalItemName = `${finalItemName} (version ${counter})`;
              counter++;
              exists = (await client.list(newPath)).some(entry => entry.name === finalItemName);
            }
          }

          return finalItemName;
        }

        if (items.length > 0) {
          const item = items[0];
          const itemPath = movePath + '/' + item.name;
          const itemName = await checkExistence(newPath, item.name, item.type);
          if (item.type === 'f') {
            const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(itemPath)}`, { responseType: 'arraybuffer' });
            const stream = new Readable();
            stream.push(response.data);
            stream.push(null);
            await client.uploadFrom(stream, newPath + '/' + itemName);
          } else if (item.type === 'd') {
            await axios.post('http://localhost:3002/create-folder', { path: receivedPath, folderName: itemName });
            const folderItems = await client.list(basePath + '/' + itemPath);
            const nestedItems = folderItems.map(fileInfo => ({
              name: fileInfo.name,
              type: fileInfo.type
            }));
            console.log(nestedItems);
            const newNestedPath = newPath + '/' + itemName;
            await moveNestedFilesAndFolders(newNestedPath, itemPath, nestedItems);
          }
          const updatedItems = items.slice(1);
          await moveFilesAndFolders(newPath, updatedItems);
        }
      }

      const moveNestedFilesAndFolders = async (newPath, nestedPath, items) => {
        if (items.length > 0) {
          const item = items[0];
          const itemPath = nestedPath + '/' + item.name;
          if (item.type === 1) {
            const response = await axios.get(`http://localhost:3002/download?path=${encodeURIComponent(itemPath)}`, { responseType: 'arraybuffer' });
            const stream = new Readable();
            stream.push(response.data);
            stream.push(null);
            await client.uploadFrom(stream, newPath + '/' + item.name);
          } else if (item.type === 2) {
            const directoryPath = newPath.replace(basePath + '/', '');
            console.log('newPath la nest: ' + newPath);
            console.log('directoryPath: ' + directoryPath);
            await axios.post('http://localhost:3002/create-folder', { path: directoryPath, folderName: item.name });
            const folderItems = await client.list(basePath + '/' + itemPath);
            const nestedItems = folderItems.map(fileInfo => ({
              name: fileInfo.name,
              type: fileInfo.type
            }));
            console.log('Nested items in nested:');
            console.log(nestedItems);
            const newNestedPath = newPath + '/' + item.name;
            await moveNestedFilesAndFolders(newNestedPath, itemPath, nestedItems);
          }
          const updatedItems = items.slice(1);
          await moveNestedFilesAndFolders(newPath, nestedPath, updatedItems);
        }
      }

      const deleteOldFilesAndFolders = async (items) => {
        if (items.length > 0) {
          const item = items[0];
          const itemPath = basePath + '/' + movePath + '/' + item.name;
          if (item.type === 'f') {
            await client.remove(itemPath);
          } else if (item.type === 'd') {
            await deletePathRecursively(itemPath);
          }

          let updatedItems = items.slice(1);
          await deleteOldFilesAndFolders(updatedItems);
        }
      }

      await moveFilesAndFolders(newPath, items);
      await deleteOldFilesAndFolders(items);

      copiedItems = [];
      res.status(200).send('File(s) moved succesfully');
    } catch (error) {
      console.error('Error moving file(s):', error);
      res.status(500).send('Error moving file(s)');
    }
  } else {
    res.status(500).send('Error moving file(s)');
  }
});

app.listen(3002, () => {
  console.log('Server running on port 3002');
});