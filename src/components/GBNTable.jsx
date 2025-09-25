import React from 'react';
import './GBNTable.css';

const GBNTable = ({ packets, base, windowSize, onToggle }) => {
  
  const getClassName = (id) => {
    // Highlight the window from base to base + windowSize
    if (id >= base && id < base + windowSize) {
      return 'window-active';
    }
    return '';
  };

  return (
    <div className="table-container">
      <h3>Packet Status & Controls</h3>
      <table>
        <thead>
          <tr>
            <th>Pkt #</th>
            {packets.map(p => (
              <th key={p.id} className={getClassName(p.id)}>
                {p.isDummy ? '' : p.id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sent</td>
            {packets.map(p => <td key={p.id}>{!p.isDummy && (p.status === 'sent' || p.status === 'acked') ? '✔️' : ''}</td>)}
          </tr>
          <tr>
            <td>ACK'd</td>
            {packets.map(p => <td key={p.id}>{!p.isDummy && p.status === 'acked' ? '✔️' : ''}</td>)}
          </tr>
          <tr className="control-row">
            <td>Pkt Success</td>
            {packets.map(p => (
              <td key={p.id}>
                {!p.isDummy && (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={p.packetWillSucceed}
                      onChange={() => onToggle(p.id, 'packetWillSucceed')}
                    />
                    <span className="slider"></span>
                  </label>
                )}
              </td>
            ))}
          </tr>
          <tr className="control-row">
            <td>ACK Success</td>
            {packets.map(p => (
              <td key={p.id}>
                {!p.isDummy && (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={p.ackWillSucceed}
                      onChange={() => onToggle(p.id, 'ackWillSucceed')}
                    />
                    <span className="slider"></span>
                  </label>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default GBNTable;