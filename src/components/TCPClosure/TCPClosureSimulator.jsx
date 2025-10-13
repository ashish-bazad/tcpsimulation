// src/components/TCPClosure/TCPClosureSimulator.jsx
import React, { useEffect, useRef, useState } from 'react';
import LogBox from '../LogBox';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import './TCPClosure.css';

const ANIMATION_DURATION = 1500;

function TCPClosureSimulator() {
  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);
  const [clientStateBits, setClientStateBits] = useState(1);
  const [serverStateBits, setServerStateBits] = useState(1);
  const [clientState, setClientState] = useState('ESTABLISHED');
  const [serverState, setServerState] = useState('ESTABLISHED');

  const transmissionStatus = {
    fin1: true,
    ack1: true,
    fin2: true,
    ack2: true,
  }

  const addToLog = (message) => setLog(prev => [...prev, message]);

  const handleSendFinServer = () => {
    if(!(serverStateBits & 1)) {
      addToLog("🔴 Server cannot send FIN in its current state.");
      return;
    }

    const packetKey = `fin-server-${Date.now()}`;
    const willSucceed = transmissionStatus.fin1;

    addToLog(`(Server): Sending FIN...`);
    // Corrected: Use 'ack' type for server-to-client animation
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'FIN', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
        if (willSucceed) {
          setServerStateBits(serverStateBits ^ 1);
          addToLog(`(Client): Received FIN.`);
          setClientStateBits(clientStateBits | 2);
        } else {
          addToLog(`(Network): 🔴 FIN from server was lost.`);
        }
        setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendFinClient = () => {
    if(!(clientStateBits & 1)) {
      addToLog("🔴 Client cannot send FIN in its current state.");
      return;
    }

    const packetKey = `fin-client-${Date.now()}`;
    const willSucceed = transmissionStatus.fin2;

    addToLog(`(Client): Sending FIN...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'FIN', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);

    setTimeout(() => {
        if (willSucceed) {
          setClientStateBits(clientStateBits ^ 1);
          addToLog(`(Server): Received FIN.`);
          setServerStateBits(serverStateBits | 2);
        } else {
          addToLog(`(Network): 🔴 FIN from client was lost.`);
        }
        setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAckClient = () => {
    if(!(clientStateBits & 2)) {
      addToLog("🔴 Client cannot send ACK in its current state.");
      return;
    }

    const packetKey = `ack-client-${Date.now()}`;
    const willSucceed = transmissionStatus.ack1;

    addToLog(`(Client): Sending ACK...`);
    // Corrected: Use 'packet' type for client-to-server animation
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: 'ACK', y: 50, status: willSucceed ? 'in-flight' : 'lost' }]);
    
    setTimeout(() => {
        if (willSucceed) {
          setClientStateBits(clientStateBits ^ 2);
          addToLog(`(Server): Received ACK.`);
        } else {
          addToLog(`(Network): 🔴 ACK from client was lost.`);
        }
        setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleSendAckServer = () => {
    if(!(serverStateBits & 2)) {
      addToLog("🔴 Server cannot send ACK in its current state.");
      return;
    }

    const packetKey = `ack-server-${Date.now()}`;
    const willSucceed = transmissionStatus.ack2;

    addToLog(`(Server): Sending ACK...`);
    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'ack', seq: 'ACK', y: 100, status: willSucceed ? 'in-flight' : 'lost' }]);
    
    setTimeout(() => {
        if (willSucceed) {
            setServerStateBits(serverStateBits ^ 2);
            addToLog(`(Client): Received ACK.`);
        } else {
            addToLog(`(Network): 🔴 Final ACK from server was lost.`);
        }
        setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };
  let shouldLogClosure = useRef(true);
  useEffect(() => {
    if(shouldLogClosure.current && serverStateBits === 0 && clientStateBits === 0) {
      shouldLogClosure.current = false;
      setClientState('CLOSED');
      setServerState('CLOSED');
      addToLog(`(Client): ⭐️ Both Server and Client received ACK. Connection Closed!`);
    }
  }, [serverStateBits, clientStateBits]);

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