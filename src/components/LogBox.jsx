import React, { useEffect, useRef } from 'react';
import './LogBox.css';

const LogBox = ({ messages }) => {
  const logContentRef = useRef(null);

  // Automatically scroll to the bottom when new messages are added
  useEffect(() => {
    if (logContentRef.current) {
      // Modifying scrollTop directly prevents the whole page from scrolling
      logContentRef.current.scrollTop = logContentRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="log-container">
      <h5>Communication Log:</h5>
      {/* Ref moved to the container div */}
      <div className="log-content" ref={logContentRef}>
        <ol>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ol>
        {/* Removed the dummy div since we scroll the container directly */}
      </div>
    </div>
  );
};

export default LogBox;