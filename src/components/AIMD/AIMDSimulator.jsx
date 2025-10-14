// src/components/AIMD/AIMDSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import GBNTable from '../GBNTable';
import LogBox from '../LogBox';
import SimulatorControls from '../SimulatorControls';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import '../../App.css';

const TOTAL_PACKETS = 10;
const INITIAL_WINDOW_SIZE = 4; // Starting in congestion avoidance
const TIMEOUT_DURATION = 7000;
const ANIMATION_DURATION = 1500;

const VIRTUAL_PACKET_COUNT = TOTAL_PACKETS + INITIAL_WINDOW_SIZE;

const initialPackets = Array.from({ length: VIRTUAL_PACKET_COUNT }, (_, i) => ({
  id: i,
  status: 'unsent',
  packetWillSucceed: true,
  ackWillSucceed: true,
  isDummy: i >= TOTAL_PACKETS,
}));

function AIMDSimulator() {
  const [packets, setPackets] = useState(initialPackets);
  const packetsRef = useRef(packets);

  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);

  const [senderBase, setSenderBase] = useState(0);
  const [windowBase, setWindowBase] = useState(0);
  const [senderNextSeqNum, setSenderNextSeqNum] = useState(0);
  const [timerValue, setTimerValue] = useState(null);
  const [windowSize, setWindowSize] = useState(INITIAL_WINDOW_SIZE);
  const [congestionWindow, setCongestionWindow] = useState(INITIAL_WINDOW_SIZE);
  const [requiredWindowSize, setRequiredWindowSize] = useState(INITIAL_WINDOW_SIZE);

  const senderWorkerRef = useRef(null);
  const receiverWorkerRef = useRef(null);

  useEffect(() => {
    packetsRef.current = packets;
  }, [packets]);

  const addToLog = (message) => setLog(prev => [...prev, message]);

  const handleToggle = (id, type) => {
    setPackets(prevPackets =>
      prevPackets.map(p =>
        p.id === id ? { ...p, [type]: !p[type] } : p
      )
    );
  };

  useEffect(() => {
    senderWorkerRef.current = new Worker('/aimd_sender.worker.js');
    receiverWorkerRef.current = new Worker('/receiver.worker.js');
    const initPayload = { totalPackets: TOTAL_PACKETS, timeoutDuration: TIMEOUT_DURATION, senderBase: senderBase, windowBase: windowBase, windowSize: windowSize, requiredWindowSize: requiredWindowSize, nextseqnum: senderNextSeqNum };
    senderWorkerRef.current.postMessage({ type: 'INIT', payload: initPayload });
    receiverWorkerRef.current.postMessage({ type: 'INIT' });

    senderWorkerRef.current.onmessage = (e) => {
      const { type, packet, message, base, windowBase, nextseqnum, timeLeft, newWindowSize, newCongestionWindow, newRequiredWindowSize } = e.data;
      if (message) addToLog(message);
      if (type === 'STATE_UPDATE') {
        if(base !== undefined) setSenderBase(base);
        if(windowBase !== undefined)setWindowBase(windowBase);
        if(nextseqnum !== undefined) setSenderNextSeqNum(nextseqnum);
        if(newRequiredWindowSize !== undefined) setRequiredWindowSize(newRequiredWindowSize);
        if (newWindowSize) {
          setWindowSize(newWindowSize);
        }
        if (newCongestionWindow) {
          setCongestionWindow(newCongestionWindow);
        }
      }
      if (type === 'SEND_PACKET') handlePacketTransmission(packet);
      if (type === 'TIMER_TICK') {
        setTimerValue(timeLeft);
      }
      if (type === 'TIMER_STOP') {
        setTimerValue(null);
      }
      if (type === 'TIMEOUT_EVENT') {
        setTimerValue('TIMEOUT!');
      }
    };
    receiverWorkerRef.current.onmessage = (e) => {
      const { type, ack, message } = e.data;
      if (message) addToLog(message);
      if (type === 'SEND_ACK') handleAckTransmission(ack);
    };

    return () => {
      senderWorkerRef.current.terminate();
      receiverWorkerRef.current.terminate();
    };
  }, []);

  const handlePacketTransmission = (packet) => {
    const packetInfo = packetsRef.current.find(p => p.id === packet.seq);
    const isLost = !packetInfo.packetWillSucceed;
    const packetKey = `${packet.seq}-${Date.now()}`;

    setPackets(prev => prev.map(p => p.id === packet.seq ? { ...p, status: 'sent' } : p));
    addToLog(`(Network): Sending Packet ${packet.seq}...`);

    setPacketsInFlight(prev => [...prev, { key: packetKey, type: 'packet', seq: packet.seq, status: isLost ? 'lost' : 'in-flight', y: 50 + (prev.length % 4) * 30 }]);

    setTimeout(() => {
      if (isLost) {
        addToLog(`(Network): 🔴 Packet ${packet.seq} was lost (manual setting)!`);
      } else {
        receiverWorkerRef.current.postMessage({ type: 'RECEIVE_PACKET', packet });
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== packetKey));
    }, ANIMATION_DURATION);
  };

  const handleAckTransmission = (ack) => {
    const packetInfo = packetsRef.current.find(p => p.id === ack);
    const isLost = !packetInfo.ackWillSucceed;
    const ackKey = `ack-${ack}-${Date.now()}`;

    addToLog(`(Network): Sending ACK ${ack}...`);

    setPacketsInFlight(prev => [...prev, { key: ackKey, type: 'ack', seq: ack, status: isLost ? 'lost' : 'in-flight', y: 50 + (prev.length % 4) * 30 }]);

    setTimeout(() => {
      if (isLost) {
        addToLog(`(Network): 🔴 ACK ${ack} was lost (manual setting)!`);
      } else {
        addToLog(`(Sender): 🟢 ACK ${ack} received successfully.`);
        setPackets(prev => prev.map(p => p.id <= ack ? { ...p, status: 'acked' } : p));
        senderWorkerRef.current.postMessage({ type: 'RECEIVE_ACK', payload: { ack } });
      }
      setPacketsInFlight(prev => prev.filter(p => p.key !== ackKey));
    }, ANIMATION_DURATION);
  };

  const handleSend = () => {
    senderWorkerRef.current.postMessage({ type: 'SEND_WINDOW' });
  };

  const handleMoveWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'MOVE_WINDOW' });
  }

  const handleResend = () => {
    senderWorkerRef.current.postMessage({ type: 'RESEND_WINDOW' });
  };
  
  const handleIncreaseWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'INCREASE_WINDOW_MANUAL' });
  };

  const handleDecreaseWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'DECREASE_WINDOW_MANUAL' });
  };


  return (
    <div className="app-container">
      <header>
        <h1>AIMD Simulator</h1>
      </header>
      
      <StatusDisplay 
        windowBase={windowBase}
        base={senderBase} 
        nextseqnum={senderNextSeqNum} 
        timerValue={timerValue}
        congestionWindow={congestionWindow}
        requiredWindowSize={requiredWindowSize}
      />

      <SimulatorControls 
        onSend={handleSend} 
        onResend={handleResend} 
        onMoveWindow={handleMoveWindow}
        onIncreaseWindow={handleIncreaseWindow}
        onDecreaseWindow={handleDecreaseWindow}
      />

      <main className="main-content">
        <GBNTable
          packets={packets}
          base={windowBase}
          windowSize={windowSize}
          onToggle={handleToggle}
        />
        <LogBox messages={log} />
      </main>
      <PacketAnimation packetsInFlight={packetsInFlight} />
    </div>
  );
}

export default AIMDSimulator;