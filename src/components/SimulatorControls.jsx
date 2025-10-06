import React from 'react';

const SimulatorControls = ({ onSend, onMoveWindow, onResend, moveWindowDisabled, resendDisabled, isStopAndWait, onIncreaseWindow, onDecreaseWindow }) => {
  return (
    <div className="controls-container" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
      <button onClick={onSend}>{isStopAndWait ? "Send Packet" : "Send Window"}</button>
      <button onClick={onMoveWindow} disabled={moveWindowDisabled}>Move Window</button>
      <button onClick={onResend} disabled={resendDisabled}>{isStopAndWait ? "Resend Packet" : "Resend Window"}</button>
      {onIncreaseWindow && <button onClick={onIncreaseWindow}>Increase Window</button>}
      {onDecreaseWindow && <button onClick={onDecreaseWindow}>Decrease Window</button>}
    </div>
  );
};

export default SimulatorControls;