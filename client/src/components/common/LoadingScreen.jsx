import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ message = 'Loading...', size = 'medium', variant = 'default' }) => {
    return (
        <div className={`loading-screen ${size} ${variant}`}>
            <div className="loading-content">
                {/* Animated circles background */}
                <div className="loading-rings">
                    <div className="ring ring-1"></div>
                    <div className="ring ring-2"></div>
                    <div className="ring ring-3"></div>
                </div>
                
                {/* Central animated logo/icon */}
                <div className="loading-center">
                    <div className="pulse-dot"></div>
                </div>
                
                {/* Progress bar */}
                <div className="loading-progress">
                    <div className="progress-track">
                        <div className="progress-fill"></div>
                    </div>
                </div>
                
                {/* Loading text */}
                <div className="loading-text-container">
                    <span className="loading-message">{message}</span>
                    <span className="loading-dots-text">
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                        <span className="dot">.</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
