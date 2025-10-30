import React from 'react';
import './PacketAnimation.css';

// Remove fixed width/height
// const SVG_WIDTH = 500;
// const SVG_HEIGHT = 200;

// This component renders the packets and ACKs currently in transit
const PacketAnimation = ({ packetsInFlight }) => {
  return (
    <div className="animation-container">
      <div className="entity sender">Sender</div>
      {/* Update SVG:
        - Remove fixed width/height.
        - Add viewBox="0 0 500 200" to define the coordinate system.
        - Add preserveAspectRatio="xMidYMid meet" for scaling.
      */}
      <svg 
        viewBox="0 0 500 200" 
        preserveAspectRatio="xMidYMid meet" 
        className="animation-svg"
      >
        {packetsInFlight.map((p) => {
          const isPacket = p.type === 'packet';
          // Use the viewBox coordinates
          const startX = isPacket ? 20 : 500 - 20;
          const endX = isPacket ? 500 - 20 : 20;

          return (
            <g
              key={p.key}
              className={`transit-item ${isPacket ? 'packet' : 'ack'} ${p.status === 'lost' ? 'lost' : ''}`}
            >
              <line x1={startX} y1={p.y} x2={endX} y2={p.y} className="path" />
              <circle cx={startX} cy={p.y} r="15" className="circle-bg" />
              <text x={startX} y={p.y} dy=".3em" textAnchor="middle" className="label">
                {isPacket ? `Pkt ${p.seq}` : `Ack ${p.seq}`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="entity receiver">Receiver</div>
    </div>
  );
};

export default PacketAnimation;