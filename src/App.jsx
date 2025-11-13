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

// Map to store titles
const protocolTitles = {
  handshake: '3-Way Handshake Simulator (Manual)',
  sw: 'Stop-and-Wait Protocol Simulator',
  gbn: 'Go-Back-N Protocol Simulator',
  slow_start: 'Slow Start Simulator',
  aimd: 'AIMD Simulator',
  closure: 'TCP Closure Simulator (4-Way Handshake)',
  tcp: 'Complete TCP Simulator', // <-- ADDED THIS
};

function App() {
  const [protocol, setProtocol] = useState('handshake'); 

  return (
    <div>
      {/* Pass the title to the Navbar */}
      <Navbar 
        setProtocol={setProtocol} 
        title={protocolTitles[protocol]} // <-- REMOVED THE TERNARY OPERATOR
      />
      
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