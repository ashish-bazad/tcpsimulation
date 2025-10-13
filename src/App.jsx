// src/App.jsx
import React, { useState } from 'react';
import GBNApp from './components/GBN/GBNSimulator';
import StopAndWaitSimulator from './components/StopAndWait/StopAndWaitSimulator';
import ThreeWayHandshakeSimulator from './components/ThreeWayHandshake/ThreeWayHandshakeSimulator';
import SlowStartSimulator from './components/SlowStart/SlowStartSimulator';
import AIMDSimulator from './components/AIMD/AIMDSimulator';
import TCPClosureSimulator from './components/TCPClosure/TCPClosureSimulator';
import TCPSimulator from './components/TCP/TCPSimulator';
import Navbar from './components/Navbar';

function App() {
  const [protocol, setProtocol] = useState('handshake'); // 'gbn', 'sw', 'handshake', 'slow_start', 'aimd', 'closure', or 'tcp'

  return (
    <div>
      <Navbar setProtocol={setProtocol} />
      {protocol === 'handshake' && <ThreeWayHandshakeSimulator />}
      {protocol === 'sw' && <StopAndWaitSimulator />}
      {protocol === 'gbn' && <GBNApp />}
      {protocol === 'slow_start' && <SlowStartSimulator />}
      {protocol === 'aimd' && <AIMDSimulator />}
      {protocol === 'closure' && <TCPClosureSimulator />}
      {protocol === 'tcp' && <TCPSimulator />}
    </div>
  );
}

export default App;