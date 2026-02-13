import React, { useState } from 'react';
import './UserAvatar.css';

const UserAvatar = ({ 
    src, 
    alt = "User Avatar", 
    fullName = "Unknown User", 
    size = 60,
    className = ""
}) => {
    const [imageError, setImageError] = useState(false);
    
    // Generate initials from full name
    const getInitials = (name) => {
        if (!name) return '??';
        
        const nameParts = name.trim().split(' ').filter(part => part.length > 0);
        if (nameParts.length === 0) return '??';
        
        if (nameParts.length === 1) {
            // Single name - take first two characters
            return nameParts[0].substring(0, 2).toUpperCase();
        }
        
        // Multiple names - take first letter of first and last name
        const firstInitial = nameParts[0].charAt(0).toUpperCase();
        const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
        return firstInitial + lastInitial;
    };

    // Generate background color from name
    const getBackgroundColor = (name) => {
        if (!name) return '#6B46C1';
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Generate a pleasant color from the hash
        const colors = [
            '#6B46C1', '#7C3AED', '#8B5CF6', '#A855F7', '#C084FC',
            '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
            '#16A34A', '#059669', '#0891B2', '#0284C7', '#2563EB',
            '#4F46E5', '#7C2D12', '#92400E', '#B45309', '#A16207'
        ];
        
        return colors[Math.abs(hash) % colors.length];
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const shouldShowImage = src && !imageError;

    return (
        <div 
            className={`user-avatar-container ${className}`}
            style={{ 
                width: size, 
                height: size,
                backgroundColor: !shouldShowImage ? getBackgroundColor(fullName) : 'transparent'
            }}
        >
            {shouldShowImage ? (
                <img 
                    className="user-avatar-image"
                    src={src}
                    alt={alt}
                    onError={handleImageError}
                    style={{ width: size, height: size }}
                />
            ) : (
                <div 
                    className="user-avatar-placeholder"
                    style={{ 
                        width: size, 
                        height: size,
                        fontSize: size * 0.4 
                    }}
                >
                    {getInitials(fullName)}
                </div>
            )}
        </div>
    );
};

export default UserAvatar;