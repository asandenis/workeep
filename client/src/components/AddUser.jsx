import React, { useState, useContext, useEffect } from 'react';
import './AddUser.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';
import jobsConfig from '../config/jobsConfig.json';
import Alert from './Alert';
import LoadingModal from './LoadingModal';

const AddUser = ({ onClose }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? 'dark' : 'light';
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [job, setJob] = useState('');
    const [jobs, setJobs] = useState([]);
    const [hours, setHours] = useState('2');
    const [salary, setSalary] = useState('');
    const [currency, setCurrency] = useState('RON');
    const [bank, setBank] = useState('');
    const [supervisor, setSupervisor] = useState('');
    const [emailError, setEmailError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [bankError, setBankError] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const [supervisors, setSupervisors] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSupervisors();
        fetchJobs();
    }, []);

    const fetchSupervisors = () => {
        setLoading(true);
        fetch('http://localhost:3001/supervisors')
          .then((response) => {
            setLoading(false);
            if (response.ok) {
              return response.json();
            }
            throw new Error('Failed to fetch supervisors');
          })
          .then((data) => {
            setSupervisors(data);
            setSupervisor(data[0].user_id);
          })
          .catch((error) => {
            console.error('Error fetching supervisors:', error);
          });
    };

    const fetchJobs = () => {
        setJobs(jobsConfig.jobs);
        setJob(jobsConfig.jobs[0].name);
    }

    const handleStepChangeNext = () => {
        if (currentStep === 1) {
            if (name && email && phoneNumber) {
                setCurrentStep(2);
            } else {
                setAlertMessage('Există câmpuri necompletate!');
            }
        } else if (currentStep === 2) {
            if (job && hours) {
                setCurrentStep(3);
            } else {
                setAlertMessage('Există câmpuri necompletate!');
            }
        } else if (currentStep === 3) {
            if (salary && currency && bank) {
                setCurrentStep(4);
            } else {
                setAlertMessage('Există câmpuri necompletate!');
            }
        } else {
            setAlertMessage('A apărut o eroare!');
            onClose();
        }
    };

    const handleStepChangeBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep-1);
        } else {
            setAlertMessage('A apărut o eroare!');
            onClose();
        }
    };

    const handleNameChange = (event) => {
        const updatedName = event.target.value.replace(/[^a-zA-Z\s-]/g, '');
        setName(updatedName);
    };

    const handleBankChange = (event) => {
        const updatedBank = event.target.value.replace(/[^A-Z0-9]/g, '');
        setBank(updatedBank);

        if (!/^[A-Z]{2}\d{2}[A-Z]{4}\d{16}$/.test(updatedBank)) {
            setBankError('Te rugăm să introduci un IBAN valid.');
        } else {
            setBankError('');
        }
    };

    const handleEmailChange = (event) => {
        const emailValue = event.target.value.trim();
        setEmail(emailValue);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            setEmailError('Te rugăm să introduci o adresă email validă.');
        } else {
            setEmailError('');
        }
    };

    const handlePhoneNumberChange = (e) => {
        const inputPhoneNumber = e.target.value;
        if (/^\d{0,10}$/.test(inputPhoneNumber)) {
          setPhoneNumber(inputPhoneNumber);
        }

        if (!/^\d{10}$/.test(inputPhoneNumber)) {
            setPhoneError('Te rugăm să introduci un număr de telefon valid.');
        } else {
            setPhoneError('');
        }
    };

    const handleJobChange = (event) => {
        setJob(event.target.value);
    };

    const handleHoursChange = (event) => {
        setHours(event.target.value);
    };

    const handleSalaryChange = (event) => {
        const inputValue = event.target.value;
        if (inputValue < 0 || inputValue === '-' || inputValue === '--') {
            setSalary('');
        } else {
            setSalary(inputValue);
        }
    };

    const handleCurrencyChange = (event) => {
        setCurrency(event.target.value);
    };

    const handleSupervisorChange = (event) => {
        setSupervisor(event.target.value);
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const closeAlert = () => {
        setAlertMessage('');
    };

    const addUser = () => {
        let trimmedName = name.trim();
        const trimmedJob = job.trim();
        const trimmedHours = hours.trim();
        const trimmedSalary = salary.trim();
    
        while (trimmedName.charAt(0) === '-' || trimmedName.charAt(trimmedName.length - 1) === '-') {
            if (trimmedName.charAt(0) === '-') {
                trimmedName = trimmedName.slice(1);
            }
            if (trimmedName.charAt(trimmedName.length - 1) === '-') {
                trimmedName = trimmedName.slice(0, -1);
            }
        }
    
        if (trimmedName && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && trimmedJob && trimmedHours && trimmedSalary && phoneNumber && /^\d{10}$/.test(phoneNumber) && currency && supervisor && bank && /^[A-Z]{2}\d{2}[A-Z]{4}\d{16}$/.test(bank)) {
            const user = {
                name: trimmedName,
                email: email,
                phone: phoneNumber,
                job: trimmedJob,
                hours: trimmedHours,
                salary: trimmedSalary,
                currency: currency,
                supervisor: supervisor,
                bank: bank
            };

            setLoading(true);
    
            fetch('http://localhost:3001/add-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            })
            .then(response => {
                setLoading(false);
                if (response.ok) {
                    setAlertMessage('S-a adăugat un nou utilizator: ' + trimmedName + '.');
                    onClose();
                } else {
                    setAlertMessage('Nu s-a putut adăugat utilizatorul. Te rugăm să încerci mai târziu!');
                    throw new Error('Failed to add user');
                }
            })
            .catch(error => {
                console.error('Error adding user:', error.message);
                setAlertMessage('Nu s-a putut adăugat utilizatorul. Te rugăm să încerci mai târziu!');
            });
        } else {
            setAlertMessage('Te rugăm să completezi toate câmpurile cu valori valide!');
        }
    };  

    return (
        <div className={`adduser-overlay ${currentStep === 2 ? 'scale-down' : ''}`} onClick={onClose}>
            <div className={`adduser-container ${theme}`} onClick={stopPropagation}>
                <div className="adduser-header">
                    {currentStep === 1 && (
                        <>
                            <h3 className="adduser-title">Pasul 1: Detalii personale</h3>
                        </>
                    )}
                    {currentStep === 2 && (
                        <>
                            <h3 className="adduser-title">Pasul 2: Detalii angajare</h3>
                        </>
                    )}
                    {currentStep === 3 && (
                        <>
                            <h3 className="adduser-title">Pasul 3: Detalii salariale</h3>
                        </>
                    )}
                    {currentStep === 4 && (
                        <>
                            <h3 className="adduser-title">Pasul 4: Detalii supervizor</h3>
                        </>
                    )}
                    <FontAwesomeIcon icon={faTimes} className={`adduser-close-icon ${theme}`} onClick={onClose} />
                </div>
                <div className="adduser-content">
                    {currentStep === 1 && (
                        <>
                            <div className="adduser-field">
                                <p>Name</p>
                                <input type="text" placeholder="Introdu nume" className={`input ${theme}`} value={name} onChange={handleNameChange} />
                            </div>
                            <div className="adduser-field">
                                <p>Email</p>
                                <input type="text" placeholder="Introdu adresă email" className={`input ${theme}`} value={email} onChange={handleEmailChange} />
                                {emailError && <p className="error-message">{emailError}</p>}
                            </div>
                            <div className='adduser-field'>
                                <p>Phone</p>
                                <input
                                    type="tel"
                                    className={`input ${theme}`}
                                    value={phoneNumber}
                                    onChange={handlePhoneNumberChange}
                                    placeholder="Introdu număr de telefon"
                                    maxLength={10}
                                    pattern="[0-9]*"
                                    required
                                />
                                {phoneError && <p className="error-message">{phoneError}</p>}
                            </div>
                            <div className="adduser-footer">
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeNext}>Pasul următor</button>
                                <button className={`adduser-button ${theme}`} onClick={onClose}>Anulează</button>
                            </div>
                        </>
                    )}
                    {currentStep === 2 && (
                        <>
                            <div className="adduser-field">
                                <p>Funcție</p>
                                <select className={`select ${theme}`} value={job} onChange={handleJobChange}>
                                    {jobs.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="adduser-field">
                                <p>Tip contract</p>
                                <select className={`select ${theme}`} value={hours} onChange={handleHoursChange}>
                                    <option value="2">Colaborator (2 ore/zi)</option>
                                    <option value="4">Part-time (4 ore/zi)</option>
                                    <option value="6">Part-time (6 ore/zi)</option>
                                    <option value="8">Full-time (8 ore/zi)</option>
                                </select>
                            </div>
                            <div className="adduser-footer">
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeNext}>Pasul următor</button>
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeBack} style={{marginBottom: 20}}>Pasul anterior</button>
                                <button className={`adduser-button ${theme}`} onClick={onClose}>Anulează</button>
                            </div>
                        </>
                    )}
                    {currentStep === 3 && (
                        <>
                            <div className="adduser-field">
                                <p>IBAN Bancă</p>
                                <input type="text" placeholder="Introdu IBAN" className={`input ${theme}`} value={bank} onChange={handleBankChange} maxLength={24} />
                                {bankError && <p className="error-message">{bankError}</p>}
                            </div>
                            <div className='salary-container'>
                                <div className="salary-field">
                                    <p>Salariu</p>
                                    <input type="number" placeholder="Introdu salariul" className={`input ${theme}`} min="0" value={salary} onChange={handleSalaryChange}/>
                                </div>
                                <div className='currency-field'>
                                    <p>Monedă</p>
                                    <select className={`select ${theme}`} value={currency} onChange={handleCurrencyChange}>
                                        <option value="RON">RON</option>
                                        <option value="EURO">EURO</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                            </div>
                            <div className="adduser-footer">
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeNext}>Pasul următor</button>
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeBack} style={{marginBottom: 20}}>Pasul anterior</button>
                                <button className={`adduser-button ${theme}`} onClick={onClose}>Anulează</button>
                            </div>
                        </>
                    )}
                    {currentStep === 4 && (
                        <>
                            <div className="adduser-field">
                                <p>Supervizor</p>
                                <select className={`select ${theme}`} value={supervisor} onChange={handleSupervisorChange}>
                                    {supervisors.map((supervisor) => (
                                        <option key={supervisor.user_id} value={supervisor.user_id}>
                                        {supervisor.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="adduser-footer">
                                <button className={`adduser-button ${theme}`} onClick={addUser}>Adaugă utilizator</button>
                                <button className={`adduser-button ${theme}`} onClick={handleStepChangeBack} style={{marginBottom: 20}}>Pasul anterior</button>
                                <button className={`adduser-button ${theme}`} onClick={onClose}>Anulează</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {alertMessage !== '' && (
                <Alert onClose={closeAlert} message={alertMessage} stopPropagation={stopPropagation}/>
            )}
            {loading && <LoadingModal />}
        </div>
    );
};

export default AddUser;