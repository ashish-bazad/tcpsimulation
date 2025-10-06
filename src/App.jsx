// src/App.jsx
import React, { useState } from 'react';
import GBNApp from './components/GBN/GBNSimulator';
import StopAndWaitSimulator from './components/StopAndWait/StopAndWaitSimulator';
import ThreeWayHandshakeSimulator from './components/ThreeWayHandshake/ThreeWayHandshakeSimulator';
import Navbar from './components/Navbar';

function App() {
  const [protocol, setProtocol] = useState('handshake'); // 'gbn', 'sw', or 'handshake'

  return (
    <div>
      <Navbar setProtocol={setProtocol} />
      {protocol === 'handshake' && <ThreeWayHandshakeSimulator />}
      {protocol === 'sw' && <StopAndWaitSimulator />}
      {protocol === 'gbn' && <GBNApp />}
    </div>
  );
}

export default App;