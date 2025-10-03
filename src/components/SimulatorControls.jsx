import React from 'react';

const SimulatorControls = ({ onSend, onMoveWindow, onResend, moveWindowDisabled, resendDisabled }) => {
  return (
    <div className="controls-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
      <button onClick={onSend}>Send Window</button>
      <button onClick={onMoveWindow} disabled={moveWindowDisabled}>Move Window</button>
      <button onClick={onResend} disabled={resendDisabled}>Resend Window</button>
    </div>
  );
};

export default SimulatorControls;