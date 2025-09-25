import React, { useEffect, useRef } from 'react';
import './LogBox.css';

const LogBox = ({ messages }) => {
  const logEndRef = useRef(null);

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="log-container">
      <h5>Communication Log:</h5>
      <div className="log-content">
        <ol>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ol>
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default LogBox;