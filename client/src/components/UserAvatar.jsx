import React, { useState, useEffect } from 'react';

const UserAvatar = ({ src, alt, fullName, className = "user-avatar" }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    console.log('UserAvatar render:', { src, fullName, imageLoaded, imageError });

    // Reset states when src changes
    useEffect(() => {
        if (src) {
            console.log('UserAvatar: Resetting states for new src:', src);
            setImageLoaded(false);
            setImageError(false);
        } else {
            console.log('UserAvatar: No src provided for:', fullName);
            setImageLoaded(false);
            setImageError(true);
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
        console.error('UserAvatar: Image failed to load:', src, e.type, e);
        setImageError(true);
        setImageLoaded(false);
    };

    const handleImageLoad = (e) => {
        console.log('UserAvatar: Image loaded successfully:', src, e.type);
        setImageLoaded(true);
        setImageError(false);
    };

    // Show placeholder if no src or image error
    if (!src || imageError) {
        console.log('UserAvatar: Showing placeholder - no src or error');
        return (
            <div className={`${className} avatar-placeholder`} title={alt || fullName}>
                <span className="avatar-initials">
                    {getInitials(fullName)}
                </span>
            </div>
        );
    }

    // Show image if loaded, placeholder with hidden loader if still loading
    return (
        <div className="avatar-container" style={{ position: 'relative' }}>
            {!imageLoaded && (
                <div className={`${className} avatar-placeholder`} title={alt || fullName}>
                    <span className="avatar-initials">
                        {getInitials(fullName)}
                    </span>
                </div>
            )}
            <img 
                className={className}
                src={src}
                alt={alt || "User avatar"}
                onError={handleImageError}
                onLoad={handleImageLoad}
                style={{ 
                    display: imageLoaded ? 'block' : 'none',
                    position: imageLoaded ? 'static' : 'absolute',
                    top: 0,
                    left: 0
                }}
            />
        </div>
    );
};

export default UserAvatar;