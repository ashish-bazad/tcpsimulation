// src/components/StatusDisplay.jsx
import React from 'react';
import './StatusDisplay.css';

const StatusDisplay = ({ windowBase, base, nextseqnum, timerValue, timerForPacket, congestionWindow, slowStartThreshold, requiredWindowSize }) => {
  const formatTimer = () => {
    if (timerValue === null) return "Off";
    if (timerValue === 'TIMEOUT!') return "TIMEOUT!";
    // Display which packet the timer is running for
    return timerForPacket ? `Pkt ${timerForPacket}: ${timerValue}s` : `${timerValue}s`;
  };

  return (
    <div className="status-container">
      {/* GBN/SW Props */}
      {base !== undefined && <div className="status-item"><span className="label">senderBase:</span><span className="value base">{base}</span></div>}
      {windowBase !== undefined && <div className="status-item"><span className="label">windowBase:</span><span className="value base">{windowBase}</span></div>}
      {nextseqnum !== undefined && <div className="status-item"><span className="label">nextseqnum:</span><span className="value nextseqnum">{nextseqnum}</span></div>}
      {congestionWindow !== undefined && <div className="status-item"><span className="label">cwnd:</span><span className="value cwnd">{congestionWindow}</span></div>}
      {requiredWindowSize !== undefined && <div className="status-item"><span className="label">Required Window Size:</span><span className="value requiredWindowSize">{requiredWindowSize}</span></div>}
      {slowStartThreshold !== undefined && <div className="status-item"><span className="label">ssthresh:</span><span className="value ssthresh">{slowStartThreshold}</span></div>}
      
      {/* Timer Display */}
      <div className="status-item">
        <span className="label">Timer:</span>
        <span className="value timer">{formatTimer()}</span>
      </div>
    </div>
  );
};

export default StatusDisplay;