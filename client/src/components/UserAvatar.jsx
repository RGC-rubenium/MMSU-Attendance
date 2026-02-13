import React, { useState, useEffect } from 'react';

const UserAvatar = ({ src, alt, fullName, className = "user-avatar" }) => {
    const [imageState, setImageState] = useState('loading'); // 'loading', 'loaded', 'error'
    
    console.log('UserAvatar render:', { src, fullName, imageState });

    // Reset state when src changes
    useEffect(() => {
        if (src) {
            console.log('UserAvatar: Starting to load image:', src);
            setImageState('loading');
        } else {
            console.log('UserAvatar: No src provided for:', fullName);
            setImageState('error');
        }
    }, [src, fullName]);

    // Generate initials from full name
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ').filter(part => part.length > 0);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const handleImageError = (e) => {
        console.error('UserAvatar: Image failed to load:', src, e);
        setImageState('error');
    };

    const handleImageLoad = () => {
        console.log('UserAvatar: Image loaded successfully:', src);
        setImageState('loaded');
    };

    // Always show placeholder if no src
    if (!src) {
        console.log('UserAvatar: Showing placeholder - no src');
        return (
            <div className={`${className} avatar-placeholder`} title={alt || fullName}>
                <span className="avatar-initials">
                    {getInitials(fullName)}
                </span>
            </div>
        );
    }

    // Show image if loaded, placeholder if error or loading
    if (imageState === 'loaded') {
        console.log('UserAvatar: Showing loaded image');
        return (
            <img 
                className={className}
                src={src}
                alt={alt || "User avatar"}
                onError={handleImageError}
                onLoad={handleImageLoad}
            />
        );
    } else {
        console.log('UserAvatar: Showing placeholder - state:', imageState);
        return (
            <>
                <div className={`${className} avatar-placeholder`} title={alt || fullName}>
                    <span className="avatar-initials">
                        {getInitials(fullName)}
                    </span>
                </div>
                {/* Hidden img to trigger loading */}
                <img 
                    src={src}
                    alt={alt || "User avatar"}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    style={{ display: 'none' }}
                />
            </>
        );
    }
};

export default UserAvatar;