import React from 'react';

const OfflineAvatar = ({ name, size = 64, background = '0D8ABC', color = 'fff' }) => {
  // Get initials (e.g., "Raven Gian" -> "RG")
  const getInitials = (name) => {
  const parts = name.trim().split(' ');
  
  if (parts.length > 1) {
    // Standard: First letter of first word + First letter of last word
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else {
    // Edge case: Only one name provided. Take first and last letter of that name.
    const singleName = parts[0];
    return (singleName[0] + singleName[singleName.length - 1]).toUpperCase();
  }
};

const initials = getInitials("Raven"); // Returns "RN"
  const style = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: `#${background}`,
    color: `#${color}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%', // Makes it a circle
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    fontSize: `${size / 2.5}px`,
    userSelect: 'none'
  };

  return <div style={style}>{"RG"}</div>;
};

export default OfflineAvatar;