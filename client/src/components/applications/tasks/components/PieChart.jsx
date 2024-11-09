import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = ({ tasks }) => {
    
    const taskCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      }, {});
    
      const data = {
        labels: ['Finalizată', 'În curs de rezolvare', 'Neasumată'],
        datasets: [
          {
            label: '# de sarcini',
            data: [
              taskCounts['Finalizată'] || 0,
              taskCounts['În curs de rezolvare'] || 0,
              taskCounts['Neasumată'] || 0,
            ],
            backgroundColor: ['#5bcc2e', '#fcae24', '#f83f2d'],
            borderWidth: 1,
          },
        ],
      };

  return (
    <div style={{ width: '100%', height: 'auto', cursor: 'pointer' }}>
      <Pie data={data} />
    </div>
  );
};

export default PieChart;