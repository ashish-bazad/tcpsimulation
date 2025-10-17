// src/components/ThreeWayHandshake/ThreeWayHandshakeSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import LogBox from '../LogBox';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import './ThreeWayHandshake.css';

const ANIMATION_DURATION = 1500;

function ThreeWayHandshakeSimulator({ onHandshakeComplete }) {
  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);
  const [clientStateBits, setClientStateBits] = useState(1);
  const [serverStateBits, setServerStateBits] = useState(0);

  const [finalAckSent, setFinalAckSent] = useState(false);

  const addToLog = (message) => setLog(prev => [...prev, message]);

  const handleSendSyn = () => {
    if ((clientStateBits & 1) === 0) {
      addToLog("🔴 Client cannot send SYN in its current state.")
      return;
    }

    const packetKey = `syn-${Date.now()}`;
    const willSucceed = true;

    addToLog(`(Client): Sending SYN...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'SYN', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
      if (willSucceed) {
        setClientStateBits(clientStateBits & ~1);
        addToLog(`(Server): Received SYN.`);
        setServerStateBits(serverStateBits | 1);
      } else {
        addToLog(`(Network): 🔴 SYN was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendSynAck = () => {
    if ((serverStateBits & 1) === 0) {
      addToLog("🔴 Server cannot send SYN-ACK in its current state.")
      return;
    }

    const packetKey = `syn-ack-${Date.now()}`;
    const willSucceed = true;

    addToLog(`(Server): Sending SYN-ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'SYN-ACK', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
      if (willSucceed) {
        setServerStateBits(serverStateBits & ~1);
        addToLog(`(Client): Received SYN-ACK.`);
        setClientStateBits(clientStateBits | 2);
      } else {
        addToLog(`(Network): 🔴 SYN-ACK was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAck = () => {
    if ((clientStateBits & 2) === 0 || finalAckSent) {
      addToLog("🔴 Client cannot send final ACK in its current state.");
      return;
    }

    const packetKey = `ack-${Date.now()}`;
    const willSucceed = true;

    addToLog(`(Client): Sending final ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'ACK', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    setFinalAckSent(true);

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Server): ⭐️ Received ACK. Connection Established!`);
        setServerStateBits(serverStateBits | 2);
        if (onHandshakeComplete) {
          onHandshakeComplete();
        }
      } else {
        addToLog(`(Network): 🔴 Final ACK was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const getStatus = (stateBits) => {
    const status = (stateBits & 2) ? 'ESTABLISHED' : 'CLOSED';
    return <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>;
  };

  return (
    <div className="app-container">
      <header>
        <h1>3-Way Handshake Simulator (Manual)</h1>
      </header>

      <div className="handshake-container">
        <div className="entity-container">
          <h2>Client</h2>
          <p>Status: {getStatus(clientStateBits)}</p>
          <button onClick={handleSendSyn}>
            {"Send SYN"}
          </button>
          <button onClick={handleSendAck}>
            Send Final ACK
          </button>
        </div>
        <div className="entity-container">
          <h2>Server</h2>
          <p>Status: {getStatus(serverStateBits)}</p>
          <button onClick={handleSendSynAck}>
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