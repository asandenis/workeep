import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

const LineChart = ({ monthlyData }) => {
  const data = {
    labels: ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec'],
    datasets: [
      {
        label: 'Finalizată Tasks',
        data: monthlyData,
        borderColor: 'blue',
        backgroundColor: 'lightblue',
        fill: true,
      },
    ],
  };

  return (
    <div style={{ width: '100%', height: 'auto', cursor: 'pointer' }}>
      <Line data={data} />
    </div>
  );
};

export default LineChart;