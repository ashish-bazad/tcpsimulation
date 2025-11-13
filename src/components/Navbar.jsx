// src/components/Navbar.jsx
import React, { useState } from 'react';
import './Navbar.css';

// Add 'title' prop
const Navbar = ({ setProtocol, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = (protocol) => {
    setProtocol(protocol);
    setIsOpen(false); // Close menu on selection
  };

  return (
    <nav className="navbar">
      <button 
        className="hamburger-menu" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
      >
        <span className="hamburger-bar"></span>
        <span className="hamburger-bar"></span>
        <span className="hamburger-bar"></span>
      </button>

      {/* Conditionally render the title (will be shown on mobile via CSS) */}
      {title && <h2 className="navbar-title">{title}</h2>}

      <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
        <button onClick={() => handleLinkClick('handshake')}>3-Way Handshake</button>
        <button onClick={() => handleLinkClick('sw')}>Stop-and-Wait</button>
        <button onClick={() => handleLinkClick('gbn')}>Go-Back-N</button>
        <button onClick={() => handleLinkClick('slow_start')}>Slow Start</button>
        <button onClick={() => handleLinkClick('aimd')}>AIMD</button>
        <button onClick={() => handleLinkClick('closure')}>TCP Closure</button>
        <button onClick={() => handleLinkClick('tcp')}>Complete TCP</button>
      </div>
    </nav>
  );
};

export default Navbar;