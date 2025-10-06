// src/components/ThreeWayHandshake/ThreeWayHandshakeSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import LogBox from '../LogBox';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import './ThreeWayHandshake.css';

const ANIMATION_DURATION = 1500;
const TIMEOUT_DURATION = 7; // in seconds

function ThreeWayHandshakeSimulator() {
  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);
  const [clientState, setClientState] = useState('CLOSED');
  const [serverState, setServerState] = useState('LISTEN');
  
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timerValue, setTimerValue] = useState(null);

  const [transmissionStatus, setTransmissionStatus] = useState({
    syn: true,
    synAck: true,
    ack: true,
  });

  const [finalAckSent, setFinalAckSent] = useState(false);

  const timerRef = useRef(null);

  const addToLog = (message) => setLog(prev => [...prev, message]);

  const handleToggle = (type) => {
    setTransmissionStatus(prev => ({ ...prev, [type]: !prev[type] }));
  };
  
  const stopTimer = () => {
      clearInterval(timerRef.current);
      setTimerValue(null);
  };

  const startTimer = () => {
    stopTimer();
    setTimerValue(TIMEOUT_DURATION);
    timerRef.current = setInterval(() => {
      setTimerValue(prev => {
        if (prev !== null && prev <= 1) { // Check for null to prevent race condition on unmount
          stopTimer();
          addToLog(`(Client): ⏱️ TIMEOUT waiting for SYN-ACK!`);
          setHasTimedOut(true);
          setClientState('CLOSED'); // Only reset client state
          return 'TIMEOUT!';
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleSendSyn = () => {
    const packetKey = `syn-${Date.now()}`;
    const willSucceed = transmissionStatus.syn;
    
    addToLog(`(Client): Sending SYN...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'SYN', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    setClientState('SYN_SENT');
    setHasTimedOut(false);
    startTimer();

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Server): Received SYN.`);
        setServerState('SYN_RCVD');
      } else {
        addToLog(`(Network): 🔴 SYN was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendSynAck = () => {
    const packetKey = `syn-ack-${Date.now()}`;
    const willSucceed = transmissionStatus.synAck;

    addToLog(`(Server): Sending SYN-ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'SYN-ACK', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Client): Received SYN-ACK.`);
        setClientState('ESTABLISHED');
        stopTimer();
      } else {
        addToLog(`(Network): 🔴 SYN-ACK was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAck = () => {
    const packetKey = `ack-${Date.now()}`;
    const willSucceed = transmissionStatus.ack;

    addToLog(`(Client): Sending final ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'ACK', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    setFinalAckSent(true); 

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Server): ⭐️ Received ACK. Connection Established!`);
        setServerState('ESTABLISHED');
      } else {
        addToLog(`(Network): 🔴 Final ACK was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };
  
  useEffect(() => {
    return () => stopTimer();
  }, []);

  const getStatus = (state) => <span className={`status-badge ${state.toLowerCase()}`}>{state.replace('_', '-')}</span>;
  
  return (
    <div className="app-container">
      <header>
        <h1>3-Way Handshake Simulator (Manual)</h1>
      </header>

      <StatusDisplay timerValue={timerValue} />

      <div className="controls-table">
        <table>
          <tbody>
            <tr>
              <td>SYN Success</td>
              <td>
                <label className="switch">
                  <input type="checkbox" checked={transmissionStatus.syn} onChange={() => handleToggle('syn')} />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td>SYN-ACK Success</td>
              <td>
                <label className="switch">
                  <input type="checkbox" checked={transmissionStatus.synAck} onChange={() => handleToggle('synAck')} />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
            <tr>
              <td>Final ACK Success</td>
              <td>
                <label className="switch">
                  <input type="checkbox" checked={transmissionStatus.ack} onChange={() => handleToggle('ack')} />
                  <span className="slider"></span>
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="handshake-container">
        <div className="entity-container">
          <h2>Client</h2>
          <p>Status: {getStatus(clientState)}</p>
          <button onClick={handleSendSyn} disabled={clientState !== 'CLOSED'}>
            {hasTimedOut ? "Resend SYN" : "Send SYN"}
          </button>
          <button onClick={handleSendAck} disabled={clientState !== 'ESTABLISHED' || finalAckSent}>
            Send Final ACK
          </button>
        </div>
        <div className="entity-container">
          <h2>Server</h2>
          <p>Status: {getStatus(serverState)}</p>
          <button onClick={handleSendSynAck} disabled={serverState !== 'SYN_RCVD'}>
            Send SYN-ACK
          </button>
        </div>
      </div>

      <main className="main-content">
        <LogBox messages={log} />
      </main>
      <PacketAnimation packetsInFlight={packetsInFlight} />
    </div>
  );
}

export default ThreeWayHandshakeSimulator;