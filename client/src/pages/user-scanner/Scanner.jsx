import React from 'react';
import { useLocation } from 'react-router-dom';
import TimeInScanner from './TimeInScanner';
import TimeOutScanner from './TimeOutScanner';

const Scanner = () => {
    const location = useLocation();
    const pathname = location.pathname;

    // Route to appropriate scanner based on URL
    if (pathname.includes('time-out')) {
        return <TimeOutScanner />;
    } else if (pathname.includes('time-in')) {
        return <TimeInScanner />;
    } else {
        // Default to time-in scanner
        return <TimeInScanner />;
    }
};

export default Scanner;
