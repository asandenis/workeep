import React, { useContext, useState, useEffect } from 'react';
import './Salary.sass';
import LoadingModal from './LoadingModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { ThemeContext } from '../App';
import banksConfig from '../config/banksConfig.json';

const Salary = ({ onClose, salary, currency, userId, hours, contract, userName }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const [loading, setLoading] = useState(false);
    const [IBAN, setIBAN] = useState('');
    const [bankCodes, setBankCodes] = useState([]);
    const [bankCode, setBankCode] = useState('');
    const [bank, setBank] = useState('');
    const [bankImage, setBankImage] = useState('');
    const [entryDay, setEntryDay] = useState('');
    const [entryHour, setEntryHour] = useState('');
    const [remainingTime, setRemainingTime] = useState('');
    const [entryDateString, setEntryDateString] = useState('');
    const [currentStep, setCurrentStep] = useState(1);
    const theme = isDarkMode ? 'dark' : 'light';

    useEffect(() => {
        const fetchBank = (userId) => {
          setLoading(true);
          fetch(`http://localhost:3001/bank/${userId}`).then((response) => {
            setLoading(false);
            if (response.ok) {
              return response.json();
            }
            throw new Error('Failed to fetch user information.');
          }).then((data) => {
            setIBAN(data.iban);
            const bankCode = data.iban.substring(4, 8);
            setBankCode(bankCode);
            console.log('Bank code:', bankCode);
          }).catch((error) => {
            console.error('Error fetching user information:', error);
          });
        };
    
        fetchBank(userId);
    }, [userId]);

    useEffect(() => {
        setBankCodes(banksConfig.bankCodes);
    }, []);

    useEffect(() => {
        if (Object.keys(bankCodes).length > 0 && bankCode) {
            if (bankCodes.hasOwnProperty(bankCode)) {
                const bankName = bankCodes[bankCode];
                setBank(bankName);
                console.log(`Bank code ${bankCode} is known. Bank name: ${bankName}`);

                import(`../media/img/bankIcons/${bankCode}.png`)
                    .then(image => {
                        setBankImage(image.default);
                    })
                    .catch(error => {
                        console.error('Error loading bank image:', error);
                        setBankImage('');
                    });
            } else {
                setBank('Unknown bank');
                console.log('Unknown bank');
            }
        }
    }, [bankCodes, bankCode]);

    const calcExpectedSalary = () => {
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
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

    useEffect(() => {
        const fetchSalaryDate = () => {
            setLoading(true);
            fetch(`http://localhost:3001/salaryConfig`).then((response) => {
                setLoading(false);
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Failed to fetch salary configuration.');
            }).then((data) => {
                setEntryDay(data.entryDay);
                setEntryHour(data.entryHour);
            }).catch((error) => {
                console.error('Error fetching salary configuration:', error);
            });
        }
        
        fetchSalaryDate();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            const today = new Date();
            const [hour, minutePart] = entryHour.split(':');
            if (!minutePart) {
                console.error('Invalid entryHour format');
                return;
            }
            const minute = minutePart.slice(0, 2);
            const period = minutePart.slice(3);
            const entryHour24 = parseInt(hour) % 12 + (period === 'PM' ? 12 : 0);

            let entryDate = new Date(today.getFullYear(), today.getMonth(), parseInt(entryDay), entryHour24, parseInt(minute));
            let entryDateString = `${('0' + entryDay).slice(-2)}.${('0' + (today.getMonth() + 1)).slice(-2)}.${today.getFullYear()} la ora ${entryHour}`;

            if (today > entryDate) {
                entryDate.setMonth(entryDate.getMonth() + 1);
                entryDateString = `${('0' + entryDay).slice(-2)}.${('0' + (entryDate.getMonth() + 1)).slice(-2)}.${entryDate.getFullYear()} la ora ${entryHour}`;
            }

            const timeDifference = entryDate - today;
            const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDifference / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((timeDifference / (1000 * 60)) % 60);
            const seconds = Math.floor((timeDifference / 1000) % 60);

            setRemainingTime(`${days} zile ${hours} ore ${minutes} minute ${seconds} secunde`);
            setEntryDateString(entryDateString);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [entryDay, entryHour]);

    const handleStepChange = () => {
        if (currentStep === 1) {
            setCurrentStep(2);
        } else {
            setCurrentStep(1);
        }
    };

    const handleDownloadClick = async () => {
        try {
            const response = await fetch('http://localhost:3001/download-salary-slip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, currency, salary, bankCode, IBAN, contract, userName }),
            });
    
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                const generatedDate = response.headers.get('X-Generated-Date');
                a.href = url;
                a.download = `Fluturaș_salariu_${userName}_${generatedDate}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                console.error('Failed to download salary slip');
            }
        } catch (error) {
            console.error('Error downloading salary slip:', error);
        }
    };

    return (
        <div className="salary-overlay" onClick={onClose}>
            <div className={`salary-container-app ${theme}`} onClick={(e) => e.stopPropagation()}>
                <div className="salary-header">
                    {currentStep === 1 && <h1 className='salary-title'>Detalii salariale</h1>}
                    {currentStep === 2 && <h1 className='salary-title'>Detalii bancare</h1>}
                    <FontAwesomeIcon icon={faTimes} className={`salary-close-icon ${theme}`} onClick={onClose} />
                </div>
                <div className='salary-content'>
                    {currentStep === 1 && (
                        <>
                            <p className='salary-text'>Salariu de bază: {salary} {currency}</p>
                            <p className='salary-text'>Ore lucrate această lună: {parseFloat(hours)} de ore</p>
                            <p className='salary-text'>Salariu estimat această lună: {calcExpectedSalary()} {currency}</p>
                            <p className='salary-text'>Salariul va intra pe data de: {entryDateString}</p>
                            <p className='salary-text'>Timp rămas: {remainingTime}</p>
                            <div className='salary-button-container'>
                                <button className='salary-bttn-download' onClick={handleDownloadClick}>Descarcă fluturașul de salariu</button>
                                <button className='salary-bttn-change-step' onClick={handleStepChange}>Detalii bancare</button>
                            </div>
                        </>
                    )}
                    {currentStep === 2 && (
                        <>
                            <div className='bank-icon-container'>
                                {bankImage && <img src={bankImage} className='bank-icon' alt={`${bank} logo`} />}
                            </div>
                            <p className='salary-text'>Bancă: {bank}</p>
                            <p className='salary-text'>IBAN: {IBAN}</p>
                            <div className='salary-button-container'>
                                <button className='salary-bttn-change-step' onClick={handleStepChange}>Detalii salariale</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {loading && <LoadingModal />}
        </div>
    );
};

export default Salary;