const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const fs = require('fs');
const util = require('util');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const pdf = require('html-pdf');
const ejs = require('ejs');
const WebSocket = require('ws');
const { userInfo } = require('os');

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

const dbConfig = JSON.parse(fs.readFileSync('config/dbConfig.json', 'utf8'));
const mailConfig = JSON.parse(fs.readFileSync('config/mailConfig.json', 'utf8'));
const salaryConfig = JSON.parse(fs.readFileSync('config/salaryConfig.json', 'utf-8'));

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Connected to MySQL database');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../client/src/media/img')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

const upload = multer({ storage: storage });

const wss = new WebSocket.Server({ port: 8080 });
const connections = {};

wss.on('connection', (ws, req) => {
  const userId = new URL(req.url, `http://${req.headers.host}`).searchParams.get('userId');
  if (userId) {
    console.log(`New connection established for user: ${userId}`);
    if (!connections[userId]) {
      connections[userId] = [];
    }
    connections[userId].push(ws);

    ws.on('close', () => {
      console.log(`Connection closed for user: ${userId}`);
      connections[userId] = connections[userId].filter(conn => conn !== ws);
      if (connections[userId].length === 0) {
        delete connections[userId];
      }
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
    });
  } else {
    ws.close();
  }
});

const generatePassword = async (length) => {
  try {
    const response = await axios.post('http://localhost:5000/input', {
      inputText: length
    });
    return response.data;
  } catch (error) {
    console.error('Error generating password:', error);
    throw error;
  }
};

const generateResetToken = async () => {
  try {
    const response = await axios.get('http://localhost:5000/generate-reset-token');
    return response.data;
  } catch (error) {
    console.error('Error generating reset token:', error);
    throw error;
  }
};

const hashPassword = async (password) => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

const mailNewAccount = (email, name, generatedPassword) => {
  const mailOptions = {
    from: 'officeworkeep',
    to: email,
    subject: 'Parola ta Workeep',
    html: `
      <p style="font-family: 'Argentum Sans', sans-serif;">Salutare, ${name}!</p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 30px; color: #333;">
        Parola noului tău cont este: <strong>${generatedPassword}</strong>
      </p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 25px; color: #333;">
        Te rugăm să păstrezi în siguranță această parolă!<br>
        Recomandăm să o schimbi cu prima ocazie!
      </p>
      <p style="font-family: 'Argentum Sans', sans-serif;">
        Cu drag,<br>Echipa Workeep
      </p>
    `
  };

  return mailOptions;
}

const mailPasswordReset = (email, token) => {
  const mailOptions = {
    from: 'officeworkeep',
    to: email,
    subject: 'Reseteaza-ti parola Workeep',
    html: `
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 30px; color: #333;">
      Resetează-ți parola accesând link-ul următor: <strong>http://localhost:3000/reset-password?token=${token}</strong>
      </p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 25px; color: #333;">
        Dacă nu ai cerut resetarea parolei sau ți-ai amintit-o, te rugăm să îți contactezi administratorul!<br>
        Recomandăm utilizarea link-ului cu prima ocazie!
      </p>
      <p style="font-family: 'Argentum Sans', sans-serif;">
        Cu drag,<br>Echipa Workeep
      </p>
    `
  };

  return mailOptions;
}

const mailInfoChanged = (email, name) => {
  const mailOptions = {
    from: 'officeworkeep',
    to: email,
    subject: 'Contul tau Workeep a fost actualizat',
    html: `
      <p style="font-family: 'Argentum Sans', sans-serif;">Hello ${name},</p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 30px; color: #333;">
        Informațiile tale personale au fost actualizate!
      </p>
      <p style="padding: 12px; border-left: 4px solid #d0d0d0; font-family: 'Argentum Sans', sans-serif; font-size: 25px; color: #333;">
        Dacă nu ai modificat tu informațiile personale, te rugăm să îți contactezi administratorul cât de curând posibil!
      </p>
      <p style="font-family: 'Argentum Sans', sans-serif;">
        Cu drag,<br>Echipa Workeep
      </p>
    `
  };

  return mailOptions;
}

const sendEmail = async (mailOptions) => {
  try {
    const transporter = nodemailer.createTransport(mailConfig);

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = `SELECT * FROM users WHERE BINARY email = ?`;
  db.query(sql, [email], async (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length > 0) {
      const hashedPassword = results[0].password;
      try {
        const match = await bcrypt.compare(password, hashedPassword);
        if (match) {
          const userId = results[0].user_id;
          res.send({ user_id: userId });
        } else {
          res.status(401).send('Invalid email or password');
        }
      } catch (error) {
        res.status(500).send('Error comparing passwords');
      }
    } else {
      res.status(401).send('Invalid email or password');
    }
  });
});

app.get('/salaryConfig', (req, res) => {
  if (salaryConfig !== null) {
    res.send(salaryConfig);
  } else {
    res.status(500).send('Eroare internă');
  }
});

app.get('/user/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = `SELECT name, email, phone, job, contract, salary, currency, profile_picture_path, hours, last_modified, supervisor_id FROM users WHERE user_id = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length > 0) {
      const userInfo = results[0];
      res.send(userInfo);
    } else {
      res.status(404).send('User not found');
    }
  });
});

const query = util.promisify(db.query).bind(db);

app.get('/userSupervisorPath/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const sql = `SELECT * FROM users WHERE user_id = ?`;
    const results = await query(sql, [userId]);

    if (results.length > 0) {
      let userSupervisor = results[0].supervisor_id;
      const userName = results[0].name;
      let supervisorPath = '';
      let supervisorIds = [];

      while (userSupervisor !== null && userSupervisor !== '') {
        supervisorIds.push(userSupervisor);
        const sqlSupervisorIds = `SELECT * FROM users WHERE user_id = ?`;
        const resultSupervIds = await query(sqlSupervisorIds, [userSupervisor]);

        if (resultSupervIds.length > 0) {
          userSupervisor = resultSupervIds[0].supervisor_id;
        } else {
          res.status(404).send('User not found');
          return;
        }
      }

      for (let i = supervisorIds.length - 1; i >= 0; i--) {
        const sqlSupervisorNames = `SELECT * FROM users WHERE user_id = ?`;
        const resultSupervNames = await query(sqlSupervisorNames, [supervisorIds[i]]);

        if (resultSupervNames.length > 0) {
          supervisorPath = supervisorPath + '/' + resultSupervNames[0].name;
        } else {
          res.status(404).send('User not found');
          return;
        }
      }

      supervisorPath = supervisorPath + '/' + userName;

      res.json({ path: supervisorPath });
    } else {
      res.status(404).send('User not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/add-user', (req, res) => {
  const { name, email, phone, job, hours, salary, currency, supervisor, bank } = req.body;

  const emailExistsQuery = 'SELECT COUNT(*) AS count FROM users WHERE email = ?';
  db.query(emailExistsQuery, [email], async (emailErr, emailResult) => {
    if (emailErr) {
      return res.status(500).send('Eroare internă');
    }
    const emailCount = emailResult[0].count;
    if (emailCount > 0) {
      return res.status(500).send('Email already exists');
    }

    try {
      const generatedPassword = await generatePassword(16);
      const hashedPassword = await hashPassword(generatedPassword);
      const currentDate = new Date();
      const sql = `INSERT INTO users (name, email, phone, password, job, contract, salary, currency, profile_picture_path, hours, last_modified, supervisor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(sql, [name, email, phone, hashedPassword, job, hours, salary, currency, "basic", 0, currentDate, supervisor], async (err, result) => {
        if (err) {
          return res.status(500).send('Eroare internă');
        }
        
        try {
          const mailOptions = mailNewAccount(email, name, generatedPassword);
          await sendEmail(mailOptions);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          return res.status(500).send('Error sending email');
        }

        const sqlGetId = `SELECT * FROM users WHERE email = ?`;
        db.query(sqlGetId, [email], async (idErr, idResult) => {
          if (idErr) {
            return res.status(500).send('Eroare internă');
          }
          const newUserId = idResult[0].user_id;

          if (!newUserId) {
            return res.status(500).send('Eroare internă');
          }

          const sqlBank = `INSERT INTO banks (iban, user_id) VALUES (?, ?)`;
          db.query(sqlBank, [bank, newUserId], async (bankErr, bankResult) => {
            if (bankErr) {
              return res.status(500).send('Eroare internă');
            }
            const pathForDir = await axios.get(`http://localhost:3001/userSupervisorPath/${supervisor}`);

            try {
              const response = await axios.post('http://localhost:3002/create-folder', {
                path: pathForDir.data.path + '/',
                folderName: name
              });
        
              if (response.status === 200) {
                return res.status(200).send('User added successfully');
              } else {
                return res.status(500).send('Error creating folder');
              }
            } catch (error) {
              return res.status(500).send('Error creating folder');
            }
          });
        });
      });
    } catch (error) {
      return res.status(500).send('Error generating password');
    }
  });
});

const getSupervisorJobs = () => {
  return ['Administrator', 'Manager', 'Director', 'Team Lead'];
};

app.get('/supervisors', (req, res) => {
  const sql = `
    SELECT user_id, name 
    FROM users 
    WHERE 
      (job LIKE ? AND job LIKE ?) 
      OR 
      (job LIKE ? OR job LIKE ? OR job LIKE ? OR job LIKE ?)
  `;
  const keywordsForChiefOfficer = ['%Chief%', '%Officer%'];
  const keywordsForOthers = getSupervisorJobs().map(keyword => `%${keyword}%`);
  const query = [...keywordsForChiefOfficer, ...keywordsForOthers];
  db.query(sql, query, (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    res.send(results);
  });
});

app.post('/isProfilePicture', (req, res) => {
  const profilePicturePath = req.body.profilePicturePath;

  const path = '../client/src/media/img/profilePictures/' + profilePicturePath;

  fs.access(path, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(500).send('Profile picture does not exist');
      return;
    } else {
      res.status(200).send('Profile picture exists');
    }
  });
});

app.post('/uploadProfilePicture/:userId', upload.single('file'), async (req, res) => {
  const userId = req.params.userId;
  const file = req.file;

  if (!file) {
    res.status(400).send('No file uploaded');
    return;
  }

  const tempFileName = `profilePictureTemp${userId}.png`;
  const tempPath = path.join(__dirname, '..', 'client', 'src', 'media', 'img', 'profilePictures', 'temp', tempFileName);

  try {
    await sharp(file.path)
      .toFormat('png')
      .toFile(tempPath);
    res.json({ tempFileName: tempFileName });
  } catch (error) {
    console.error('Error converting file to PNG:', error);
    res.status(500).send('Error converting file to PNG');
  }
});

app.post('/updateUser/:userId', async (req, res) => {
  const userId = req.params.userId;
  const { name, email, phone, oldPassword, newPassword, newProfilePicture, isDeleted } = req.body;

  const getUserInfoQuery = `SELECT * FROM users WHERE user_id = ?`;
  db.query(getUserInfoQuery, [userId], async (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }

    const userInfo = results[0];

    let updatedFields = {};
    let message = '';
    let isPassword = false;

    if (name !== userInfo.name) {
      updatedFields.name = name;
    }
    if (email !== userInfo.email) {
      updatedFields.email = email;
    }
    if (phone !== userInfo.phone) {
      updatedFields.phone = phone;
    }

    if (oldPassword && newPassword) {
      try {
        const match = await bcrypt.compare(oldPassword, userInfo.password);
        if (!match) {
          res.status(400).send('Old password is incorrect');
          return;
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        updatedFields.password = hashedNewPassword;
        isPassword = true;
      } catch (error) {
        res.status(500).send('Error updating password');
        return;
      }
    }

    if (newProfilePicture !== '') {
      const newFileName = `profilePicture${userId}.png`;
      const newPath = path.join(__dirname, '..', 'client', 'src', 'media', 'img', 'profilePictures', newFileName);
      
      try {
        const tempPath = path.join(__dirname, '..', 'client', 'src', 'media', 'img', 'profilePictures', 'temp', `profilePictureTemp${userId}.png`);
        fs.renameSync(tempPath, newPath);
        updatedFields.profile_picture_path = newFileName;
      } catch (error) {
        res.status(500).send('Error updating profile picture');
        return;
      }
    } else if (isDeleted && userInfo.profile_picture_path !== 'basic') {
      updatedFields.profile_picture_path = 'basic';
    }

    const currentDate = new Date();
    updatedFields.last_modified = currentDate;
    const updateUserQuery = `UPDATE users SET ? WHERE user_id = ?`;
    db.query(updateUserQuery, [updatedFields, userId], async (updateErr, updateResult) => {
      if (updateErr) {
        res.status(500).send('Error updating user information');
        return;
      }
      if (isPassword) {
        message = 'Password changed successfully';
      } else {
        message = 'User information updated successfully';
      }
      if (isDeleted && updatedFields.profile_picture_path === 'basic') {
        const profilePicturePath = path.join(__dirname, '..', 'client', 'src', 'media', 'img', 'profilePictures', `profilePicture${userId}.png`);
        if (fs.existsSync(profilePicturePath)) {
          fs.unlink(profilePicturePath, (err) => {
            if (err) {
              console.error('Error deleting profile picture:', err);
              res.status(500).send('Error deleting profile picture');
              return;
            }
          });
        }
      }
      try {
        const mailOptions = mailInfoChanged(email, name);
        await sendEmail(mailOptions);
        res.status(200).send(message);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        res.status(500).json({message: 'Error sending email'});;
      }
    });
  });
});

app.post('/deleteTempProfilePicture/:userId', (req, res) => {
  const userId = req.params.userId;
  const tempFileName = `profilePictureTemp${userId}.png`;
  const tempPath = path.join(__dirname, '..', 'client', 'src', 'media', 'img', 'profilePictures', 'temp', tempFileName);

  fs.access(tempPath, fs.constants.F_OK, (err) => {
    if (err) {
      res.status(404).send('Temp profile picture not found');
    } else {
      fs.unlink(tempPath, (deleteErr) => {
        if (deleteErr) {
          console.error('Error deleting temp profile picture:', deleteErr);
          res.status(500).send('Error deleting temp profile picture');
        } else {
          res.status(200).send('Temp profile picture deleted successfully');
        }
      });
    }
  });
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) {
      res.status(500).json({message: 'Eroare internă'});
      return;
    }
    if (results.length > 0) {
      const userId = results[0].user_id;
      const tokenSql = 'SELECT * FROM passwordtokens WHERE user_id = ?';
      db.query(tokenSql, [userId], async (tokenErr, tokenResults) => {
        if (tokenErr) {
          res.status(500).json({message: 'Eroare internă'});
          return;
        }
        if (tokenResults.length === 0) {
          let generatedToken;
          let tokenExists = true;
          
          while (tokenExists) {
            try {
              generatedToken = await generateResetToken();
              const tokenExistsQuery = 'SELECT * FROM passwordtokens WHERE token = ?';
              db.query(tokenExistsQuery, [generatedToken], async (tokenExistsErr, tokenExistsResults) => {
                if (tokenExistsErr) {
                  res.status(500).json({message: 'Eroare internă'});
                  return;
                } else {
                  if (tokenExistsResults.length === 0) {
                    tokenExists = false;
                  }
                }
              });
            } catch (error) {
              console.error('Error generating or checking token:', error);
              res.status(500).json({message: 'A apărut o eroare la generarea token-ului!'});
              return;
            }
          }

          const insertTokenQuery = 'INSERT INTO passwordtokens (token, date, used, user_id) VALUES (?, ?, ?, ?)';
          const currentDate = new Date();
          await db.query(insertTokenQuery, [generatedToken, currentDate, false, userId], async (err, result) => {
            if (err) {
              res.status(500).json({message: 'Eroare internă'});
              return;
            }
          });
          console.log(generatedToken);
          try {
            const mailOptions = mailPasswordReset(email, generatedToken);
            await sendEmail(mailOptions);
            res.status(200).json({message: 'User exists and no valid password reset token present'});;
          } catch (emailError) {
            console.error('Error sending email:', emailError);
            res.status(500).json({message: 'A apărut o eroare la trimiterea email-ului!'});;
          }
        } else {
          let canReset = true;
          for (let i=0; i<tokenResults.length; i++) {
            const isUsed = tokenResults[i].used;
            const tokenDate = new Date(tokenResults[i].date);
            const currentTime = new Date();
            const hoursDifference = (currentTime - tokenDate) / (1000 * 60 * 60);

            if (!isUsed || hoursDifference < 24) {
              canReset = false;
              break;
            }
          }

          if (canReset) {
            let generatedToken;
            let tokenExists = true;
            
            while (tokenExists) {
              try {
                generatedToken = await generateResetToken();
                const tokenExistsQuery = 'SELECT * FROM passwordtokens WHERE token = ?';
                db.query(tokenExistsQuery, [generatedToken], async (tokenExistsErr, tokenExistsResults) => {
                  if (tokenExistsErr) {
                    res.status(500).json({message: 'Eroare internă'});
                    return;
                  } else {
                    if (tokenExistsResults.length === 0) {
                      tokenExists = false;
                    }
                  }
                });
              } catch (error) {
                console.error('Error generating or checking token:', error);
                res.status(500).json({message: 'A apărut o eroare la generarea token-ului!'});
                return;
              }
            }

            const insertTokenQuery = 'INSERT INTO passwordtokens (token, date, used, user_id) VALUES (?, ?, ?, ?)';
            const currentDate = new Date();
            await db.query(insertTokenQuery, [generatedToken, currentDate, false, userId], async (err, result) => {
              if (err) {
                res.status(500).json({message: 'Eroare internă'});
                return;
              }
            });
            console.log(generatedToken);
            try {
              const mailOptions = mailPasswordReset(email, generatedToken);
              await sendEmail(mailOptions);
              res.status(200).json({message: 'User exists and no valid password reset token present'});;
            } catch (emailError) {
              console.error('Error sending email:', emailError);
              res.status(500).json({message: 'A apărut o eroare la trimiterea email-ului!'});;
            }
          } else {
            res.status(404).json({message: 'Un link nefolosit pentru resetarea parolei deja există sau parola a fost modificată în ultimele 24 de ore!'});
          }
        }
      });
    } else {
      res.status(404).json({message: 'User not found'});
    }
  });
});

app.get('/check-token-state', (req, res) => {
  const token = req.query.token;

  const sql = 'SELECT * FROM passwordtokens WHERE token = ?';
  db.query(sql, [token], (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Token not found');
    } else {
      const used = results[0].used;
      const id = results[0].user_id;
      const userSql = 'SELECT * FROM users WHERE user_id = ?';
      db.query(userSql, [id], (err, userResults) => {
        if (err) {
          res.status(500).send('Eroare internă');
          return;
        }
        if (userResults.length === 0) {
          res.status(404).send('User not found');
        } else {
          const name = userResults[0].name;
          const email = userResults[0].email;
          res.status(200).send({ used, name, email });
        }
      });
    }
  });
});

app.post('/reset-password', async (req, res) => {
  const { email, newPassword, token } = req.body;
  let name;
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  const sqlCheckPassword = 'SELECT * FROM users WHERE email = ?';
  db.query(sqlCheckPassword, [email], async (err, result) => {
    if (err) {
      console.error('Error resetting password:', err);
      res.status(500).send('Eroare internă');
      return;
    }
    if (result.length === 0) {
      res.status(404).send('User not found');
      return;
    } else {
      const databasePassword = result[0].password;
      name = result[0].name;
      const match = await bcrypt.compare(newPassword, databasePassword);
      if (match) {
        res.status(400).send('New password cannot be the same as the old one');
        return;
      } else {
        const currentDate = new Date();
        const sql = 'UPDATE users SET password = ?, last_modified = ? WHERE email = ?';
        db.query(sql, [hashedNewPassword, currentDate, email], (err, result) => {
          if (err) {
            console.error('Error resetting password:', err);
            res.status(500).send('Eroare internă');
            return;
          }
          if (result.affectedRows === 0) {
            res.status(404).send('User not found');
          } else {
            const sqlUpdateToken = 'UPDATE passwordtokens SET used = 1 WHERE token = ?';
            db.query(sqlUpdateToken, [token], async (err, result) => {
              if (err) {
                console.error('Error updating token');
                return;
              }
              try {
                const mailOptions = mailInfoChanged(email, name);
                await sendEmail(mailOptions);
                res.status(200).send('Password reset successfully');
              } catch (emailError) {
                console.error('Error sending email:', emailError);
                res.status(500).json({message: 'Error sending email'});;
              }
            })
          }
        });
      }
    }
  })
});

app.post('/update-hours', (req, res) => {
  const { userId, hoursWorked } = req.body;

  const getUserHoursQuery = `SELECT * FROM users WHERE user_id = ?`;
  db.query(getUserHoursQuery, [userId], (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length === 0) {
      res.status(404).send('User not found');
      return;
    }

    const currentHours = parseFloat(results[0].hours);
    const updatedHours = currentHours + parseFloat(hoursWorked);

    const updateHoursQuery = `UPDATE users SET hours = ? WHERE user_id = ?`;
    db.query(updateHoursQuery, [updatedHours, userId], (err, updateResult) => {
      if (err) {
        res.status(500).send('Error updating hours worked');
        return;
      }
      res.status(200).send('Hours updated successfully');
    });
  });
});

app.get('/bank/:userId', (req, res) => {
  const userId = req.params.userId;

  const sql = `SELECT * FROM banks WHERE user_id = ?`;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      res.status(500).send('Eroare internă');
      return;
    }
    if (results.length > 0) {
      const iban = results[0];
      res.send(iban);
    } else {
      res.status(404).send('User not found');
    }
  });
});

app.get('/user-hierarchy', (req, res) => {
  const sql = `
    WITH RECURSIVE UserHierarchy AS (
      SELECT user_id, name, supervisor_id
      FROM users
      WHERE supervisor_id IS NULL
      UNION ALL
      SELECT u.user_id, u.name, u.supervisor_id
      FROM users u
      INNER JOIN UserHierarchy uh ON u.supervisor_id = uh.user_id
    )
    SELECT * FROM UserHierarchy;
  `;

  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).send('Internal server error');
      return;
    }
    res.send(results);
  });
});

app.post('/download-salary-slip', async (req, res) => {
  const { userId, currency, salary, bankCode, IBAN, contract, userName } = req.body;

  db.query('SELECT * FROM salaryslips WHERE user_id = ? ORDER BY date DESC LIMIT 1', [userId], (err, results) => {
      if (err) {
          return res.status(500).send('Database query failed');
      }

      if (results.length === 0) {
          return res.status(404).send('No salary slips found for user');
      }

      const { hours, sslip_id, date } = results[0];

      const calculatedSalary = calcExpectedSalary(salary, hours, date, contract);
      const cas = calculatedSalary * 0.25;
      const cass = calculatedSalary * 0.1;
      const iv = calculatedSalary * 0.1;
      const netSalary = calculatedSalary - cas - cass - iv;

      const template = fs.readFileSync(path.join(__dirname, 'salarySlipTemplate.html'), 'utf8');

      const logoPath = path.resolve(__dirname, 'media/img/logo.png');
      const bankLogoPath = path.resolve(__dirname, `media/img/bankIcons/${bankCode}.png`);

      const logoBase64 = fs.readFileSync(logoPath, 'base64');
      const bankLogoBase64 = fs.readFileSync(bankLogoPath, 'base64');

      const logoDataUri = `data:image/png;base64,${logoBase64}`;
      const bankLogoDataUri = `data:image/png;base64,${bankLogoBase64}`;

      const html = ejs.render(template, {
          data: new Date(date).toLocaleDateString(),
          sslip_id,
          name: userName,
          salary,
          currency,
          hours,
          calculatedSalary: parseFloat(calculatedSalary).toFixed(2),
          cas: parseFloat(cas).toFixed(2),
          cass: parseFloat(cass).toFixed(2),
          iv: parseFloat(iv).toFixed(2),
          netSalary: parseFloat(netSalary).toFixed(2),
          bankLogo: bankLogoDataUri,
          iban: IBAN,
          logo: logoDataUri,
      });

      pdf.create(html, {}).toBuffer((err, buffer) => {
          if (err) {
              return res.status(500).send('Failed to generate PDF');
          }

          const formattedDate = new Date(date).toLocaleDateString();
          res.setHeader('Content-Disposition', 'attachment; filename=salary_slip.pdf');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('X-Generated-Date', formattedDate);
          res.setHeader('Access-Control-Expose-Headers', 'X-Generated-Date');
          res.send(buffer);
      });
  });
});

function calcExpectedSalary(salary, hours, date, contract) {
  const currentMonth = new Date(date).getMonth();
  const currentYear = new Date(date).getFullYear();
  
  let workableDays = 0;
  for (let day = 1; day <= new Date(currentYear, currentMonth + 1, 0).getDate(); day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workableDays++;
      }
  }

  let expectedSalary = parseFloat(salary);
  const expectedHours = parseInt(contract) * workableDays;
  if (parseFloat(hours) >= parseFloat(expectedHours)) {
      expectedSalary = (expectedSalary + ((parseFloat(hours) - parseFloat(expectedHours)) * 1.75 * (expectedSalary / expectedHours))).toFixed(2);
  } else {
      expectedSalary = (expectedSalary - ((parseFloat(expectedHours) - parseFloat(hours)) * (expectedSalary / expectedHours))).toFixed(2);
  }
  return expectedSalary;
};

app.post('/add-task', async (req, res) => {
  const { title, description, deadline, userId, roles } = req.body;
  const addressedTo = roles.join(',');
  const status = 'Neasumată';

  const insertTask = `INSERT INTO tasks (title, description, deadline, created_by, addressed_to, status) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(insertTask, [title, description, deadline, userId, addressedTo, status], (err, result) => {
    if (err) {
      console.error('Error inserting task:', err);
      res.status(500).send('Server error');
      return;
    }

    const taskId = result.insertId;

    const getSubordinates = (userId, callback) => {
      const subordinatesQuery = `
        WITH RECURSIVE subordinates AS (
          SELECT user_id, job, supervisor_id
          FROM users
          WHERE supervisor_id = ?
          UNION
          SELECT u.user_id, u.job, u.supervisor_id
          FROM users u
          INNER JOIN subordinates s ON s.user_id = u.supervisor_id
        )
        SELECT user_id
        FROM subordinates
        WHERE job IN (?)
      `;

      db.query(subordinatesQuery, [userId, roles], (err, results) => {
        if (err) {
          console.error('Error fetching subordinates:', err);
          callback(err, null);
          return;
        }
        callback(null, results.map(result => result.user_id));
      });
    };

    getSubordinates(userId, (err, subordinates) => {
      if (err) {
        res.status(500).send('Server error');
        return;
      }

      if (subordinates.length > 0) {
        const insertUserTasks = `
          INSERT INTO usertasks (user_id, task_id)
          VALUES ?
        `;

        const userTasksData = subordinates.map(subordinateId => [subordinateId, taskId]);

        db.query(insertUserTasks, [userTasksData], (err) => {
          if (err) {
            console.error('Error inserting user tasks:', err);
            res.status(500).send('Server error');
            return;
          }

          const message = JSON.stringify({ type: 'alert', text: 'O sarcină nouă a fost adăugată' });
          
          subordinates.forEach(subordinateId => {
            if (connections[subordinateId]) {
              connections[subordinateId].forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(message, (error) => {
                    if (error) {
                      console.error(`Error sending message to user ${subordinateId}:`, error);
                    } else {
                      console.log(`Message sent to user ${subordinateId}`);
                    }
                  });
                } else {
                  console.warn(`WebSocket connection not open for user ${subordinateId}`);
                }
              });
            } else {
              console.warn(`No connections found for user ${subordinateId}`);
            }
          });

          res.status(201).send('Task and user tasks added successfully');
        });
      } else {
        res.status(201).send('Task added successfully but no matching subordinates found');
      }
    });
  });
});

app.get('/tasks/:userId', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT DISTINCT t.task_id, t.title, t.description, t.deadline, t.status, t.created_by, t.solution, t.feedback, t.addressed_to
    FROM tasks t
    WHERE t.created_by = ?
    UNION
    SELECT DISTINCT t.task_id, t.title, t.description, t.deadline, t.status, t.created_by, t.solution, t.feedback, t.addressed_to
    FROM tasks t
    JOIN usertasks ut ON t.task_id = ut.task_id
    WHERE ut.user_id = ?
  `;

  db.query(query, [userId, userId], (err, results) => {
    if (err) {
      console.error('Error fetching tasks:', err);
      res.status(500).send('Server error');
      return;
    }
    res.status(200).json(results);
  });
});

app.post('/add-task-solution', async (req, res) => {
  const { taskId, solution } = req.body;

  const getTaskQuery = `SELECT title, created_by FROM tasks WHERE task_id = ?`;
  db.query(getTaskQuery, [taskId], (err, taskResults) => {
    if (err) {
      console.error('Error fetching task details:', err);
      res.status(500).send('Error fetching task details');
      return;
    }

    if (taskResults.length === 0) {
      res.status(404).send('Task not found');
      return;
    }

    const task = taskResults[0];
    const { title, created_by: userId } = task;

    const message = JSON.stringify({ type: 'alert', text: `O soluție a fost adăugată sarcinii ${title}.` });

    if (connections[userId]) {
      connections[userId].forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message, (error) => {
            if (error) {
              console.error(`Error sending message to user ${userId}:`, error);
            } else {
              console.log(`Message sent to user ${userId}`);
            }
          });
        } else {
          console.warn(`WebSocket connection not open for user ${userId}`);
        }
      });
    } else {
      console.warn(`No connections found for user ${userId}`);
    }

    const addSolutionQuery = `UPDATE tasks SET solution = ?, status = ? WHERE task_id = ?`;
    db.query(addSolutionQuery, [solution, 'În curs de rezolvare', taskId], (err, results) => {
      if (err) {
        res.status(500).send('Error updating task solution');
        return;
      }
      res.status(200).send('Solution updated successfully');
    });
  });
});

app.post('/add-task-feedback', async (req, res) => {
  const { taskId, feedback } = req.body;

  const getTaskQuery = `SELECT title, created_by FROM tasks WHERE task_id = ?`;
  db.query(getTaskQuery, [taskId], (err, taskResults) => {
    if (err) {
      console.error('Error fetching task details:', err);
      res.status(500).send('Error fetching task details');
      return;
    }

    if (taskResults.length === 0) {
      res.status(404).send('Task not found');
      return;
    }

    const task = taskResults[0];
    const { title, created_by: userId } = task;

    const getSubordinates = (userId, callback) => {
      const subordinatesQuery = `
        WITH RECURSIVE subordinates AS (
          SELECT user_id, job, supervisor_id
          FROM users
          WHERE supervisor_id = ?
          UNION
          SELECT u.user_id, u.job, u.supervisor_id
          FROM users u
          INNER JOIN subordinates s ON s.user_id = u.supervisor_id
        )
        SELECT user_id
        FROM subordinates
      `;

      db.query(subordinatesQuery, [userId], (err, results) => {
        if (err) {
          console.error('Error fetching subordinates:', err);
          callback(err, null);
          return;
        }
        callback(null, results.map(result => result.user_id));
      });
    };

    getSubordinates(userId, (err, subordinates) => {
      if (err) {
        res.status(500).send('Server error');
        return;
      }

      if (subordinates.length > 0) {
        const message = JSON.stringify({ type: 'alert', text: `O soluție a fost adăugată sarcinii ${title}.` });

        subordinates.forEach(subordinateId => {
          if (connections[subordinateId]) {
            connections[subordinateId].forEach(ws => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(message, (error) => {
                  if (error) {
                    console.error(`Error sending message to user ${subordinateId}:`, error);
                  } else {
                    console.log(`Message sent to user ${subordinateId}`);
                  }
                });
              } else {
                console.warn(`WebSocket connection not open for user ${subordinateId}`);
              }
            });
          } else {
            console.warn(`No connections found for user ${subordinateId}`);
          }
        });
      }

      const addFeedbackQuery = `UPDATE tasks SET feedback = ?, status = ? WHERE task_id = ?`;
      db.query(addFeedbackQuery, [feedback, 'În curs de rezolvare', taskId], (err, results) => {
        if (err) {
          res.status(500).send('Error updating task feedback');
          return;
        }
        res.status(200).send('Feedback updated successfully');
      });
    });
  });
});

app.post('/open-close-task', async (req, res) => {
  const { taskId, status } = req.body;
  const newStatus = status === 'În curs de rezolvare' ? 'Finalizată' : 'În curs de rezolvare';

  const openCloseQuery = `UPDATE tasks SET status = ? WHERE task_id = ?`;
  db.query(openCloseQuery, [newStatus, taskId], (err, results) => {
    if (err) {
      console.error('Error updating task status:', err);
      res.status(500).send('Error updating task status');
      return;
    }

    const taskQuery = `
      SELECT t.title, t.created_by, u.name
      FROM tasks t
      JOIN users u ON u.user_id = t.created_by
      WHERE t.task_id = ?
    `;

    db.query(taskQuery, [taskId], (err, results) => {
      if (err) {
        console.error('Error fetching task details:', err);
        res.status(500).send('Error fetching task details');
        return;
      }

      if (results.length === 0) {
        res.status(404).send('Task not found');
        return;
      }

      const task = results[0];
      const createdByUser = task.name;

      let notificationMessage = '';
      if (newStatus === 'Finalizată') {
        notificationMessage = `Sarcina ${task.title} a fost marcată ca finalizată de către ${createdByUser}.`;
      } else {
        notificationMessage = `Sarcina ${task.title} a fost redeschisă de către ${createdByUser}.`;
      }

      const getSubordinatesQuery = `
        SELECT user_id
        FROM users
        WHERE supervisor_id = ?
      `;

      db.query(getSubordinatesQuery, [task.created_by], (err, subordinateResults) => {
        if (err) {
          console.error('Error fetching subordinates:', err);
          res.status(500).send('Error fetching subordinates');
          return;
        }

        const subordinateUserIds = subordinateResults.map(subordinate => subordinate.user_id);

        subordinateUserIds.forEach(subordinateUserId => {
          if (connections[subordinateUserId]) {
            const message = JSON.stringify({ type: 'alert', text: notificationMessage });
            connections[subordinateUserId].forEach(ws => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(message, (error) => {
                  if (error) {
                    console.error(`Error sending message to user ${subordinateUserId}:`, error);
                  } else {
                    console.log(`Message sent to user ${subordinateUserId}`);
                  }
                });
              } else {
                console.warn(`WebSocket connection not open for user ${subordinateUserId}`);
              }
            });
          } else {
            console.warn(`No connections found for user ${subordinateUserId}`);
          }
        });

        res.status(200).send('Status updated successfully and notifications sent');
      });
    });
  });
});

app.delete('/delete-task', async (req, res) => {
  const { taskId } = req.body;

  const deleteUserTasksQuery = `DELETE FROM usertasks WHERE task_id = ?`;
    db.query(deleteUserTasksQuery, [taskId], (err, results) => {
    if (err) {
      res.status(500).send('Error deleting task');
      return;
    }
    const deleteQuery = `DELETE FROM tasks WHERE task_id = ?`;
  db.query(deleteQuery, [taskId], (error, results) => {
      if (error) {
        res.status(500).send('Error deleting task');
        return;
      }
    });
    res.status(200).send('Deleted task successfully');
  });
});

app.post('/edit-task', async (req, res) => {
  const { taskId, title, deadline, description, roles, userId } = req.body;
  const addressedTo = roles.join(',');

  const editTaskQuery = `UPDATE tasks SET title = ?, deadline = ?, description = ?, addressed_to = ?, status = ?, solution = ?, feedback = ? WHERE task_id = ?`;
  db.query(editTaskQuery, [title, deadline, description, addressedTo, 'Neasumată', '', '', taskId], (err, results) => {
    if (err) {
      res.status(500).send('Error editing task');
      return;
    }

    const deleteUserTasksQuery = `DELETE FROM usertasks WHERE task_id = ?`;
    db.query(deleteUserTasksQuery, [taskId], (error, results) => {
      if (error) {
        res.status(500).send('Error deleting task');
        return;
      }

      const getSubordinates = (userId, callback) => {
        const subordinatesQuery = `
          WITH RECURSIVE subordinates AS (
            SELECT user_id, job, supervisor_id
            FROM users
            WHERE supervisor_id = ?
            UNION
            SELECT u.user_id, u.job, u.supervisor_id
            FROM users u
            INNER JOIN subordinates s ON s.user_id = u.supervisor_id
          )
          SELECT user_id
          FROM subordinates
          WHERE job IN (?)
        `;

        db.query(subordinatesQuery, [userId, roles], (err, results) => {
          if (err) {
            console.error('Error fetching subordinates:', err);
            callback(err, null);
            return;
          }
          callback(null, results.map(result => result.user_id));
        });
      };

      getSubordinates(userId, (err, subordinates) => {
        if (err) {
          res.status(500).send('Server error');
          return;
        }

        if (subordinates.length > 0) {
          const insertUserTasks = `
            INSERT INTO usertasks (user_id, task_id)
            VALUES ?
          `;

          const userTasksData = subordinates.map(subordinateId => [subordinateId, taskId]);

          db.query(insertUserTasks, [userTasksData], (err) => {
            if (err) {
              console.error('Error inserting user tasks:', err);
              res.status(500).send('Server error');
              return;
            }

            const message = JSON.stringify({ type: 'alert', text: `Sarcina ${title} a fost actualizată.` });

            subordinates.forEach(subordinateId => {
              if (connections[subordinateId]) {
                connections[subordinateId].forEach(ws => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message, (error) => {
                      if (error) {
                        console.error(`Error sending message to user ${subordinateId}:`, error);
                      } else {
                        console.log(`Message sent to user ${subordinateId}`);
                      }
                    });
                  } else {
                    console.warn(`WebSocket connection not open for user ${subordinateId}`);
                  }
                });
              } else {
                console.warn(`No connections found for user ${subordinateId}`);
              }
            });

            res.status(200).send('Task edited and notifications sent successfully');
          });
        } else {
          res.status(200).send('Task edited successfully but no matching subordinates found');
        }
      });
    });
  });
});

app.get('/get-users', (req, res) => {
  const query = `SELECT user_id, name FROM users`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).send('Server error');
      return;
    }
    res.status(200).json(results);
  });
});

app.post('/add-event', (req, res) => {
  const { title, description, color, created_by, start_date, end_date, employees } = req.body;

  const eventQuery = `INSERT INTO events (title, description, color, created_by, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(eventQuery, [title, description, color, created_by, start_date, end_date], (err, result) => {
    if (err) {
      console.error('Error inserting event:', err);
      res.status(500).send('Server error');
      return;
    }

    const eventId = result.insertId;

    if (employees && employees.length > 0) {
      const userEventPromises = employees.map(employeeId => {
        return new Promise((resolve, reject) => {
          const userEventQuery = `INSERT INTO userevents (user_id, event_id) VALUES (?, ?)`;
          db.query(userEventQuery, [employeeId, eventId], (err, result) => {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          });
        });
      });

      Promise.all(userEventPromises)
        .then(() => {
          const message = JSON.stringify({ type: 'alert', text: 'Un eveniment nou a fost adăugat' });

          employees.forEach(employeeId => {
            if (connections[employeeId]) {
              connections[employeeId].forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(message, (error) => {
                    if (error) {
                      console.error(`Error sending message to user ${employeeId}:`, error);
                    } else {
                      console.log(`Message sent to user ${employeeId}`);
                    }
                  });
                } else {
                  console.warn(`WebSocket connection not open for user ${employeeId}`);
                }
              });
            } else {
              console.warn(`No connections found for user ${employeeId}`);
            }
          });

          res.status(200).send('Event created successfully and notifications sent');
        })
        .catch(err => {
          console.error('Error inserting user events:', err);
          res.status(500).send('Server error');
        });
    } else {
      res.status(200).send('Event created successfully');
    }
  });
});

app.get('/events/:userId', async (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT e.event_id, e.title, e.description, e.color, e.created_by, e.start_date, e.end_date
    FROM events e
    LEFT JOIN userevents ue ON e.event_id = ue.event_id
    WHERE ue.user_id = ?
       OR e.created_by = ?
  `;

  try {
    const results = await new Promise((resolve, reject) => {
      db.query(query, [userId, userId], (err, results) => {
        if (err) {
          console.error('Error fetching events:', err);
          reject(err);
          return;
        }
        resolve(results);
      });
    });

    const eventsWithRsvp = [];

    for (const event of results) {
      try {
        const rsvpQuery = 'SELECT rsvp FROM userevents WHERE event_id = ? AND user_id = ?';
        const rsvpResult = await new Promise((resolve, reject) => {
          db.query(rsvpQuery, [event.event_id, userId], (err, rsvpResult) => {
            if (err) {
              console.error(`Error fetching RSVP for event ${event.event_id}:`, err);
              reject(err);
              return;
            }
            resolve(rsvpResult.length > 0 ? rsvpResult[0].rsvp : null);
          });
        });

        eventsWithRsvp.push({ ...event, rsvp: rsvpResult });
      } catch (error) {
        console.error(`Error handling event ${event.event_id}:`, error);
      }
    }

    res.json(eventsWithRsvp);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
});

app.post('/accept-event', (req, res) => {
  const { userId, eventId } = req.body;

  const updateQuery = `
    UPDATE userevents
    SET rsvp = 'Acceptat'
    WHERE user_id = ?
      AND event_id = ?
  `;

  db.query(updateQuery, [userId, eventId], (err, result) => {
    if (err) {
      console.error('Error updating RSVP:', err);
      res.status(500).json({ error: 'Error updating RSVP' });
      return;
    }

    const eventQuery = `
      SELECT e.title, e.created_by, u.name
      FROM events e
      JOIN users u ON u.user_id = ?
      WHERE e.event_id = ?
    `;
    
    db.query(eventQuery, [userId, eventId], (err, results) => {
      if (err) {
        console.error('Error fetching event details:', err);
        res.status(500).json({ error: 'Error fetching event details' });
        return;
      }

      const event = results[0];
      const notificationMessage = `Utilizatorul ${event.name} a acceptat evenimentul ${event.title}.`;

      if (connections[event.created_by]) {
        const message = JSON.stringify({ type: 'alert', text: notificationMessage });
        connections[event.created_by].forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message, (error) => {
              if (error) {
                console.error(`Error sending message to user ${event.created_by}:`, error);
              } else {
                console.log(`Message sent to user ${event.created_by}`);
              }
            });
          } else {
            console.warn(`WebSocket connection not open for user ${event.created_by}`);
          }
        });
      } else {
        console.warn(`No connections found for user ${event.created_by}`);
      }

      res.status(200).json({ message: 'RSVP updated successfully' });
    });
  });
});

app.post('/reject-event', (req, res) => {
  const { userId, eventId } = req.body;

  const updateQuery = `
    UPDATE userevents
    SET rsvp = 'Respins'
    WHERE user_id = ?
      AND event_id = ?
  `;

  db.query(updateQuery, [userId, eventId], (err, result) => {
    if (err) {
      console.error('Error updating RSVP:', err);
      res.status(500).json({ error: 'Error updating RSVP' });
      return;
    }

    const eventQuery = `
      SELECT e.title, e.created_by, u.name
      FROM events e
      JOIN users u ON u.user_id = ?
      WHERE e.event_id = ?
    `;
    
    db.query(eventQuery, [userId, eventId], (err, results) => {
      if (err) {
        console.error('Error fetching event details:', err);
        res.status(500).json({ error: 'Error fetching event details' });
        return;
      }

      const event = results[0];
      const notificationMessage = `Utilizatorul ${event.name} a refuzat evenimentul ${event.title}.`;

      if (connections[event.created_by]) {
        const message = JSON.stringify({ type: 'alert', text: notificationMessage });
        connections[event.created_by].forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message, (error) => {
              if (error) {
                console.error(`Error sending message to user ${event.created_by}:`, error);
              } else {
                console.log(`Message sent to user ${event.created_by}`);
              }
            });
          } else {
            console.warn(`WebSocket connection not open for user ${event.created_by}`);
          }
        });
      } else {
        console.warn(`No connections found for user ${event.created_by}`);
      }

      res.status(200).json({ message: 'RSVP updated successfully' });
    });
  });
});

app.delete('/delete-event', async (req, res) => {
  const { eventId } = req.body;

  const deleteUserEventsQuery = `DELETE FROM userevents WHERE event_id = ?`;
  db.query(deleteUserEventsQuery, [eventId], (err, results) => {
  if (err) {
    res.status(500).send('Error deleting event');
    return;
  }
  const deleteQuery = `DELETE FROM events WHERE event_id = ?`;
  db.query(deleteQuery, [eventId], (error, results) => {
      if (error) {
        res.status(500).send('Error deleting event');
        return;
      }
    });
    res.status(200).send('Deleted event successfully');
  });
});

app.get('/event-users/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  const query = `
    SELECT u.name, ue.rsvp
    FROM users u
    INNER JOIN userevents ue ON u.user_id = ue.user_id
    WHERE ue.event_id = ?
  `;

  db.query(query, [eventId], (err, results) => {
    if (err) {
      res.status(500).send('Error retrieving users');
      return;
    }
    res.json(results);
  });
});

app.put('/edit-event', async (req, res) => {
  const { event_id, title, description, color, start_date, end_date, user_ids } = req.body;

  const updateEventQuery = `
    UPDATE events
    SET title = ?, description = ?, color = ?, start_date = ?, end_date = ?
    WHERE event_id = ?
  `;

  db.query(updateEventQuery, [title, description, color, start_date, end_date, event_id], (err, results) => {
    if (err) {
      console.error('Error updating event:', err);
      res.status(500).send('Error updating event');
      return;
    }

    const deleteUserEventsQuery = `
      DELETE FROM userevents
      WHERE event_id = ?
    `;

    db.query(deleteUserEventsQuery, [event_id], (errDel, resDel) => {
      if (errDel) {
        console.error('Error deleting user events:', errDel);
        res.status(500).send('Error deleting user events');
        return;
      }

      if (user_ids && user_ids.length > 0) {
        const userEventPromises = user_ids.map(user_id => {
          return new Promise((resolve, reject) => {
            const userEventQuery = `INSERT INTO userevents (user_id, event_id) VALUES (?, ?)`;
            db.query(userEventQuery, [user_id, event_id], (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
        });

        Promise.all(userEventPromises)
          .then(() => {
            const message = JSON.stringify({ type: 'alert', text: `Evenimentul ${title} a fost actualizat.` });

            user_ids.forEach(user_id => {
              if (connections[user_id]) {
                connections[user_id].forEach(ws => {
                  if (ws.readyState === WebSocket.OPEN) {
                    ws.send(message, (error) => {
                      if (error) {
                        console.error(`Error sending message to user ${user_id}:`, error);
                      } else {
                        console.log(`Message sent to user ${user_id}`);
                      }
                    });
                  } else {
                    console.warn(`WebSocket connection not open for user ${user_id}`);
                  }
                });
              } else {
                console.warn(`No connections found for user ${user_id}`);
              }
            });

            res.status(200).send('Event updated successfully and notifications sent');
          })
          .catch(err => {
            console.error('Error inserting user events:', err);
            res.status(500).send('Error inserting user events');
          });
      } else {
        res.status(200).send('Event updated successfully');
      }
    });
  });
});

app.delete('/delete-user/:user_id', (req, res) => {
  const userId = req.params.user_id;

  const pTokenQuery = `DELETE FROM passwordtokens WHERE user_id = ?`;
  db.query(pTokenQuery, [userId], (errPToken, resultPToken) => {
    if (errPToken) {
      res.status(500).json({ error: 'Failed to delete user.' });
    } else {
      const banksQuery = `DELETE FROM banks WHERE user_id = ?`;

      db.query(banksQuery, [userId], (errBanks, resultBanks) => {
        if (errBanks) {
          res.status(500).json({ error: 'Failed to delete user.' });
        } else {
          const salarySlipsQuery = `DELETE FROM banks WHERE user_id = ?`;
    
          db.query(salarySlipsQuery, [userId], (errSalarySlips, resultSalarySlips) => {
            if (errSalarySlips) {
              res.status(500).json({ error: 'Failed to delete user.' });
            } else {
              const tasksQuery = `DELETE FROM tasks WHERE created_by = ?`;
        
              db.query(tasksQuery, [userId], (errTasks, resultTasks) => {
                if (errTasks) {
                  res.status(500).json({ error: 'Failed to delete user.' });
                } else {
                  const userTasksQuery = `DELETE FROM usertasks WHERE user_id = ?`;
            
                  db.query(userTasksQuery, [userId], (errUserTasks, resultUserTasks) => {
                    if (errUserTasks) {
                      res.status(500).json({ error: 'Failed to delete user.' });
                    } else {
                      const eventsQuery = `DELETE FROM events WHERE created_by = ?`;
                
                      db.query(eventsQuery, [userId], (errEvents, resultsEvents) => {
                        if (errEvents) {
                          res.status(500).json({ error: 'Failed to delete user.' });
                        } else {
                          const userEventsQuery = `DELETE FROM userevents WHERE user_id = ?`;
                    
                          db.query(userEventsQuery, [userId], (errUserEvents, resultUserEvents) => {
                            if (errUserEvents) {
                              res.status(500).json({ error: 'Failed to delete user.' });
                            } else {
                              const userQuery = `DELETE FROM users WHERE user_id = ?`;
                        
                              db.query(userQuery, [userId], (errUser, resultUser) => {
                                if (errBanks) {
                                  res.status(500).json({ error: 'Failed to delete user.' });
                                } else {
                                  res.sendStatus(200);
                                }
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});

app.post('/edit-user', (req, res) => {
  const { userId, name, email, phone, job, contract, salary, currency, supervisor } = req.body;

  const updateFields = [];
  const updateValues = [];

  if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
  }
  if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
  }
  if (phone) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
  }
  if (job) {
      updateFields.push('job = ?');
      updateValues.push(job);
  }
  if (contract) {
      updateFields.push('contract = ?');
      updateValues.push(contract);
  }
  if (salary) {
      updateFields.push('salary = ?');
      updateValues.push(salary);
  }
  if (currency) {
      updateFields.push('currency = ?');
      updateValues.push(currency);
  }
  if (supervisor) {
      updateFields.push('supervisor_id = ?');
      updateValues.push(supervisor);
  }

  if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
  }

  updateValues.push(userId);

  const updateQuery = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
  `;

  db.query(updateQuery, updateValues, (err, result) => {
      if (err) {
          console.error('Error updating user details:', err);
          res.status(500).json({ error: 'Failed to update user details' });
      } else {
          console.log(`User details updated successfully for user ${userId}`);
          res.status(200).json({ message: 'User details updated successfully' });
      }
  });
});

app.post('/edit-bank', (req, res) => {
  const { userId, IBAN } = req.body;

  const checkBankQuery = `
      SELECT * FROM banks
      WHERE user_id = ?
  `;

  db.query(checkBankQuery, [userId], (err, results) => {
      if (err) {
          console.error('Error checking bank details:', err);
          res.status(500).json({ error: 'Failed to check bank details' });
          return;
      }

      if (results.length > 0) {
          if (results[0].iban === IBAN) {
              console.log('IBAN has not changed. Skipping update.');
              return res.status(200).json({ message: 'No changes needed' });
          }

          const updateBankQuery = `
              UPDATE banks
              SET iban = ?
              WHERE user_id = ?
          `;

          db.query(updateBankQuery, [IBAN, userId], (error, result) => {
              if (error) {
                  console.error('Error updating bank details:', error);
                  res.status(500).json({ error: 'Failed to update bank details' });
              } else {
                  console.log(`Bank details updated successfully for user ${userId}`);
                  res.status(200).json({ message: 'Bank details updated successfully' });
              }
          });
      } else {
          const createBankQuery = `
              INSERT INTO banks (user_id, iban)
              VALUES (?, ?)
          `;

          db.query(createBankQuery, [userId, IBAN], (error, result) => {
              if (error) {
                  console.error('Error creating bank entry:', error);
                  res.status(500).json({ error: 'Failed to create bank entry' });
              } else {
                  console.log(`Bank entry created successfully for user ${userId}`);
                  res.status(200).json({ message: 'Bank entry created successfully' });
              }
          });
      }
  });
});

const sendNotification = (message) => {
  for (const userId in connections) {
    connections[userId].forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'alert', text: message }), (error) => {
          if (error) {
            console.error(`Error sending message to user ${userId}:`, error);
          } else {
            console.log(`Message sent to user ${userId}`);
          }
        });
      } else {
        console.warn(`WebSocket connection not open for user ${userId}`);
      }
    });
  }
};

const scheduleNotifications = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const entryDay = parseInt(salaryConfig.entryDay, 10);
  const entryTime = salaryConfig.entryHour.split(' ');
  const [entryHour, entryMinute] = entryTime[0].split(':').map(Number);
  const entryMeridiem = entryTime[1];

  let entryDate = new Date(year, month, entryDay, entryHour % 12 + (entryMeridiem === 'PM' ? 12 : 0), entryMinute);

  if (entryDate < now) {
    entryDate.setMonth(entryDate.getMonth() + 1);
  }

  const timeDiffs = [
    { daysBefore: 3, message: 'Salariul va intra în 3 zile.' },
    { daysBefore: 2, message: 'Salariul va intra în 2 zile.' },
    { daysBefore: 1, message: 'Salariul va intra în o zi.' },
    { daysBefore: 0, message: 'A intrat salariul.' }
  ];

  timeDiffs.forEach(diff => {
    const notificationTime = new Date(entryDate.getTime() - diff.daysBefore * 24 * 60 * 60 * 1000);
    const timeToNotification = notificationTime - now;

    if (timeToNotification > 0) {
      setTimeout(() => {
        sendNotification(diff.message);
      }, timeToNotification);
    }
  });
};

scheduleNotifications();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});