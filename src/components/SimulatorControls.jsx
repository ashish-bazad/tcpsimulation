import React from 'react';

const SimulatorControls = ({ onSend, onResend, resendDisabled }) => {
  return (
    <div className="controls-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
      <button onClick={onSend}>Send New Packet</button>
      <button onClick={onResend} disabled={resendDisabled}>Resend Window</button>
    </div>
  );
};

export default SimulatorControls;