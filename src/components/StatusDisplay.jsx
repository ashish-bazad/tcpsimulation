import React from 'react';
import './StatusDisplay.css';

const StatusDisplay = ({ windowBase, base, nextseqnum, timerValue, timerForPacket }) => {
  const formatTimer = () => {
    if (timerValue === null) return "Off";
    if (timerValue === 'TIMEOUT!') return "TIMEOUT!";
    // Display which packet the timer is running for
    return `Pkt ${timerForPacket}: ${timerValue}s`;
  };

  return (
    <div className="status-container">
      <div className="status-item">
        <span className="label">windowBase:</span>
        <span className="value base">{windowBase}</span>
      </div>
      <div className="status-item">
        <span className="label">senderBase:</span>
        <span className="value base">{base}</span>
      </div>
      <div className="status-item">
        <span className="label">nextseqnum:</span>
        <span className="value nextseqnum">{nextseqnum}</span>
      </div>
      <div className="status-item">
        <span className="label">Timer:</span>
        <span className="value timer">{formatTimer()}</span>
      </div>
    </div>
  );
};

export default StatusDisplay;