// src/components/StopAndWait/StopAndWaitSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import GBNTable from '../GBNTable';
import LogBox from '../LogBox';
import SimulatorControls from '../SimulatorControls';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import '../../App.css';

const TOTAL_PACKETS = 10;
const WINDOW_SIZE = 1; // Window size is 1 for Stop-and-Wait
const TIMEOUT_DURATION = 7000;
const ANIMATION_DURATION = 1500;

const VIRTUAL_PACKET_COUNT = TOTAL_PACKETS + WINDOW_SIZE;

const initialPackets = Array.from({ length: VIRTUAL_PACKET_COUNT }, (_, i) => ({
  id: i,
  status: 'unsent',
  packetWillSucceed: true,
  ackWillSucceed: true,
  isDummy: i >= TOTAL_PACKETS,
}));

function StopAndWaitSimulator() {
  const [packets, setPackets] = useState(initialPackets);
  const packetsRef = useRef(packets);

  const [log, setLog] = useState([]);
  const [packetsInFlight, setPacketsInFlight] = useState([]);

  const [senderBase, setSenderBase] = useState(0);
  const [windowBase, setWindowBase] = useState(0);
  const [senderNextSeqNum, setSenderNextSeqNum] = useState(0);
  const [timerValue, setTimerValue] = useState(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timerForPacket, setTimerForPacket] = useState(null);

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
    senderWorkerRef.current = new Worker('/sw_sender.worker.js');
    receiverWorkerRef.current = new Worker('/sw_receiver.worker.js');
    const initPayload = { totalPackets: TOTAL_PACKETS, timeoutDuration: TIMEOUT_DURATION };
    senderWorkerRef.current.postMessage({ type: 'INIT', payload: initPayload });
    receiverWorkerRef.current.postMessage({ type: 'INIT' });

    senderWorkerRef.current.onmessage = (e) => {
      const { type, packet, message, base, windowBase, nextseqnum, timeLeft } = e.data;
      if (message) addToLog(message);
      if (type === 'STATE_UPDATE') {
        setSenderBase(base);
        setWindowBase(windowBase);
        setSenderNextSeqNum(nextseqnum);
      }
      if (type === 'SEND_PACKET') handlePacketTransmission(packet);
      if (type === 'TIMER_TICK') {
        setTimerValue(timeLeft);
        setTimerForPacket(base);
        setHasTimedOut(false);
      }
      if (type === 'TIMER_STOP') {
        setTimerValue(null);
        setTimerForPacket(null);
        setHasTimedOut(false);
      }
      if (type === 'TIMEOUT_EVENT') {
        setTimerValue('TIMEOUT!');
        setHasTimedOut(true);
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
    if (hasTimedOut) {
      alert("A timeout has occurred. Please use 'Resend Packet' to recover.");
      return;
    }
    if (windowBase !== senderBase) {
        alert("Please move the window before sending the next packet.");
        return;
    }
    senderWorkerRef.current.postMessage({ type: 'SEND_PACKET' });
  };

  const handleResend = () => {
    if (!hasTimedOut) {
      alert("Please wait for the timeout to occur before resending.");
      return;
    }
    senderWorkerRef.current.postMessage({ type: 'RESEND_PACKET' });
    setHasTimedOut(false);
  };

  const handleMoveWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'MOVE_WINDOW' });
  }

  const isMoveWindowDisabled = windowBase === senderBase;

  return (
    <div className="app-container">
      <header>
        <h1>Stop-and-Wait Protocol Simulator</h1>
      </header>

      <StatusDisplay
        windowBase={windowBase}
        base={senderBase}
        nextseqnum={senderNextSeqNum}
        timerValue={timerValue}
        timerForPacket={timerForPacket}
      />

      <SimulatorControls
        onSend={handleSend}
        onResend={handleResend}
        onMoveWindow={handleMoveWindow}
        isStopAndWait={true}
        moveWindowDisabled={isMoveWindowDisabled}
        resendDisabled={!hasTimedOut}
      />

      <main className="main-content">
        <GBNTable
          packets={packets}
          base={windowBase}
          windowSize={WINDOW_SIZE}
          onToggle={handleToggle}
        />
        <LogBox messages={log} />
      </main>
      <PacketAnimation packetsInFlight={packetsInFlight} />
    </div>
  );
}

export default StopAndWaitSimulator;