// src/components/TCPClosure/TCPClosureSimulator.jsx
import React, { useState } from 'react';
import LogBox from '../LogBox';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import './TCPClosure.css';

const ANIMATION_DURATION = 1500;

function TCPClosureSimulator() {
  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);
  const [clientState, setClientState] = useState('ESTABLISHED');
  const [serverState, setServerState] = useState('ESTABLISHED');

  const transmissionStatus = {
    fin1: true,
    ack1: true,
    fin2: true,
    ack2: true,
  }

  const addToLog = (message) => setLog(prev => [...prev, message]);

  const handleSendFinClient = () => {
    if (clientState !== 'ESTABLISHED') {
      addToLog("🔴 Client cannot send FIN in its current state.");
      return;
    }

    const packetKey = `fin-client-${Date.now()}`;
    const willSucceed = transmissionStatus.fin1;

    addToLog(`(Client): Sending FIN...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'FIN', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    setClientState('FIN_WAIT_1');

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Server): Received FIN.`);
        setServerState('CLOSE_WAIT');
      } else {
        addToLog(`(Network): 🔴 FIN from client was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAckServer = () => {
    if (serverState !== 'CLOSE_WAIT') {
      addToLog("🔴 Server cannot send ACK in its current state.");
      return;
    }

    const packetKey = `ack-server-${Date.now()}`;
    const willSucceed = transmissionStatus.ack1;

    addToLog(`(Server): Sending ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'ACK', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Client): Received ACK.`);
        setClientState('FIN_WAIT_2');
      } else {
        addToLog(`(Network): 🔴 ACK from server was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendFinServer = () => {
    if (serverState !== 'CLOSE_WAIT') {
        addToLog("🔴 Server cannot send FIN in its current state.");
        return;
      }

    const packetKey = `fin-server-${Date.now()}`;
    const willSucceed = transmissionStatus.fin2;

    addToLog(`(Server): Sending FIN...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'FIN', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);
    setServerState('LAST_ACK');

    setTimeout(() => {
      if (willSucceed) {
        addToLog(`(Client): Received FIN.`);
        setClientState('TIME_WAIT');
      } else {
        addToLog(`(Network): 🔴 FIN from server was lost.`);
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAckClient = () => {
    if (clientState !== 'TIME_WAIT') {
        addToLog("🔴 Client cannot send ACK in its current state.");
        return;
    }

    const packetKey = `ack-client-${Date.now()}`;
    const willSucceed = transmissionStatus.ack2;

    addToLog(`(Client): Sending ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'ACK', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    
    setTimeout(() => {
        if (willSucceed) {
            addToLog(`(Server): ⭐️ Received ACK. Connection Closed!`);
            setServerState('CLOSED');
        } else {
            addToLog(`(Network): 🔴 Final ACK from client was lost.`);
        }
        setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
        
        // Client moves to CLOSED after a timeout in TIME_WAIT, simulated here
        setTimeout(() => {
            setClientState('CLOSED');
            addToLog(`(Client): TIME_WAIT finished. Connection Closed.`);
        }, 2000);

    }, ANIMATION_DURATION);
  };

  const getStatus = (state) => <span className={`status-badge ${state.toLowerCase()}`}>{state.replace('_', '-')}</span>;

  return (
    <div className="app-container">
      <header>
        <h1>TCP Closure Simulator (4-Way Handshake)</h1>
      </header>

      <StatusDisplay />

      <div className="handshake-container">
        <div className="entity-container">
          <h2>Client</h2>
          <p>Status: {getStatus(clientState)}</p>
          <button onClick={handleSendFinClient}>
            Send FIN
          </button>
          <button onClick={handleSendAckClient}>
            Send ACK
          </button>
        </div>
        <div className="entity-container">
          <h2>Server</h2>
          <p>Status: {getStatus(serverState)}</p>
          <button onClick={handleSendAckServer}>
            Send ACK
          </button>
          <button onClick={handleSendFinServer}>
             Send FIN
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

export default TCPClosureSimulator;