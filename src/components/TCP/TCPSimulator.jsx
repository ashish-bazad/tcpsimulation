// src/components/TCP/TCPSimulator.jsx
import React, { useState, useEffect, useRef } from 'react';
import GBNTable from '../GBNTable';
import LogBox from '../LogBox';
import SimulatorControls from '../SimulatorControls';
import PacketAnimation from '../PacketAnimation';
import StatusDisplay from '../StatusDisplay';
import ThreeWayHandshakeSimulator from '../ThreeWayHandshake/ThreeWayHandshakeSimulator';
import TCPClosureSimulator from '../TCPClosure/TCPClosureSimulator';
import './TCP.css';

const TOTAL_PACKETS = 20;
const INITIAL_WINDOW_SIZE = 1;
const TIMEOUT_DURATION = 7000;
const ANIMATION_DURATION = 1500;
const INITIAL_SSTHRESH = 4;

const VIRTUAL_PACKET_COUNT = TOTAL_PACKETS + INITIAL_WINDOW_SIZE;

const initialPackets = Array.from({ length: VIRTUAL_PACKET_COUNT }, (_, i) => ({
  id: i,
  status: 'unsent',
  packetWillSucceed: true,
  ackWillSucceed: true,
  isDummy: i >= TOTAL_PACKETS,
}));

function TCPSimulator() {
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
  const [windowSize, setWindowSize] = useState(INITIAL_WINDOW_SIZE);
  const [congestionWindow, setCongestionWindow] = useState(1);
  const [slowStartThreshold, setSlowStartThreshold] = useState(INITIAL_SSTHRESH);
  const [requiredWindowSize, setRequiredWindowSize] = useState(INITIAL_WINDOW_SIZE);
  const [phaseChange, setPhaseChange] = useState(0);

  let shouldChangePhase = useRef(true);
  
  const [phase, setPhase] = useState('handshake'); // handshake, slow_start, aimd, closure
  useEffect(() => {
    if(shouldChangePhase.current) {
      if(phase === 'slow_start') {
        setPhaseChange(prev => prev + 1);
        shouldChangePhase.current = false;
      }
    }
  }, [phase]);

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
    if ((phase === 'slow_start' || phase === 'aimd') && !senderWorkerRef.current) {
      senderWorkerRef.current = new Worker('/tcp_sender.worker.js');
      receiverWorkerRef.current = new Worker('/receiver.worker.js');
      const initPayload = { totalPackets: TOTAL_PACKETS, timeoutDuration: TIMEOUT_DURATION, ssthresh: INITIAL_SSTHRESH };
      senderWorkerRef.current.postMessage({ type: 'INIT', payload: initPayload });
      receiverWorkerRef.current.postMessage({ type: 'INIT' });

      senderWorkerRef.current.onmessage = (e) => {
        const { type, packet, message, base, windowBase, nextseqnum, timeLeft, newWindowSize, newCongestionWindow, newSlowStartThreshold, newPhase, newRequiredWindowSize } = e.data;
        if (message) addToLog(message);
        if (type === 'STATE_UPDATE') {
          if (base !== undefined) setSenderBase(base);
          if (windowBase !== undefined) setWindowBase(windowBase);
          if (newRequiredWindowSize !== undefined) setRequiredWindowSize(newRequiredWindowSize);
          if (nextseqnum !== undefined) setSenderNextSeqNum(nextseqnum);
          if (newWindowSize) setWindowSize(newWindowSize);
          if (newCongestionWindow) setCongestionWindow(newCongestionWindow);
          if (newSlowStartThreshold) setSlowStartThreshold(newSlowStartThreshold);
          if (newPhase) setPhase(newPhase);
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
    }

    return () => {
      if (senderWorkerRef.current) {
        senderWorkerRef.current.terminate();
        senderWorkerRef.current = null;
      }
      if (receiverWorkerRef.current) {
        receiverWorkerRef.current.terminate();
        receiverWorkerRef.current = null;
      }
    };
  }, [phaseChange]);

  const handleHandshakeComplete = () => {
    addToLog("⭐️ TCP Handshake Complete. Starting Slow Start.");
    setPhase('slow_start');
  };

  // useEffect(() => {
  //   if (senderBase === TOTAL_PACKETS && phase !== 'closure' && phase !== 'handshake') {
  //     addToLog("All packets sent and acknowledged. Starting TCP Closure.");
  //     setPhase('closure');
  //   }
  // }, [senderBase, phase]);


  const handlePacketTransmission = (packet) => {
    const packetInfo = packetsRef.current.find(p => p.id === packet.seq);
    const isLost = packetInfo ? !packetInfo.packetWillSucceed : false;
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
    const isLost = packetInfo ? !packetInfo.ackWillSucceed : false;
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
      alert("A timeout has occurred. Please use 'Resend Window' to recover.");
      return;
    }
    senderWorkerRef.current.postMessage({ type: 'SEND_WINDOW' });
  };

  const handleMoveWindow = () => {
    if(isMoveWindowDisabled) {
      postMessage({ type: 'LOG', message: `(Sender): 🔴 Window is already at the base, cannot move further!` });
      return;
    }
    senderWorkerRef.current.postMessage({ type: 'MOVE_WINDOW' });
  }

  const handleResend = () => {
    if (!hasTimedOut) {
      alert("Please wait for the timeout to occur before resending.");
      return;
    }
    if (windowBase !== senderBase) {
      alert("Please move the window before resending.");
      return;
    }
    if(isResendDisabled) {
      postMessage({ type: 'LOG', message: `(Sender): 🔴 No timeout has occurred, cannot resend!` });
      return;
    }
    senderWorkerRef.current.postMessage({ type: 'RESEND_WINDOW' });
    setHasTimedOut(false);
  };

  const handleIncreaseWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'INCREASE_WINDOW_MANUAL' });
  };

  const handleDecreaseWindow = () => {
    senderWorkerRef.current.postMessage({ type: 'DECREASE_WINDOW_MANUAL' });
  };

  if (phase === 'handshake') {
    return <ThreeWayHandshakeSimulator onHandshakeComplete={handleHandshakeComplete} />;
  }

  if (phase === 'closure') {
    return <TCPClosureSimulator />;
  }


  const isResendDisabled = !hasTimedOut;
  const isMoveWindowDisabled = windowBase === senderBase;

  return (
    <div className="app-container">
      <header>
        <h1>Complete TCP Simulator</h1>
        <h2>Current Phase: <span className="phase-display">{phase.replace('_', ' ')}</span></h2>
      </header>

      <StatusDisplay
        windowBase={windowBase}
        base={senderBase}
        nextseqnum={senderNextSeqNum}
        timerValue={timerValue}
        timerForPacket={timerForPacket}
        congestionWindow={congestionWindow}
        slowStartThreshold={slowStartThreshold}
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

export default TCPSimulator;