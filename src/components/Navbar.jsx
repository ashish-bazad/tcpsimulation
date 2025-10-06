// src/components/Navbar.jsx
import React from 'react';
import './Navbar.css';

const Navbar = ({ setProtocol }) => {
  return (
    <nav className="navbar">
      <button onClick={() => setProtocol('handshake')}>3-Way Handshake</button>
      <button onClick={() => setProtocol('sw')}>Stop-and-Wait</button>
      <button onClick={() => setProtocol('gbn')}>Go-Back-N</button>
      <button onClick={() => setProtocol('slow_start')}>Slow Start</button>
      <button onClick={() => setProtocol('aimd')}>AIMD</button>
    </nav>
  );
};

export default Navbar;