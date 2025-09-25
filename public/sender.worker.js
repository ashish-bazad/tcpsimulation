let N;
let base = 0;
let nextseqnum = 0;
let totalPackets;
let timeoutDuration;

let timerInterval = null;
let timeLeft = 0;

const startTimer = () => {
  if (timerInterval) clearInterval(timerInterval);

  timeLeft = timeoutDuration / 1000;
  postMessage({ type: 'TIMER_TICK', timeLeft, base });

  timerInterval = setInterval(() => {
    timeLeft--;
    postMessage({ type: 'TIMER_TICK', timeLeft, base });

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      postMessage({ type: 'LOG', message: `(Sender): TIMEOUT for packets starting from base ${base}. Manual resend required.` });
      postMessage({ type: 'TIMEOUT_EVENT' });
    }
  }, 1000);
};

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  postMessage({ type: 'TIMER_STOP' });
};

onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT':
      N = payload.windowSize;
      totalPackets = payload.totalPackets;
      timeoutDuration = payload.timeoutDuration;
      base = 0;
      nextseqnum = 0;
      stopTimer();
      postMessage({ type: 'STATE_UPDATE', base, nextseqnum });
      break;

    case 'SEND_NEXT':
      if (nextseqnum < base + N && nextseqnum < totalPackets) {
        if (base === nextseqnum) {
          startTimer();
        }
        postMessage({ type: 'SEND_PACKET', packet: { seq: nextseqnum } });
        nextseqnum++;
        postMessage({ type: 'STATE_UPDATE', base, nextseqnum });
      } else {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Window is full. Cannot send new packet.` });
      }
      break;
    
    case 'RESEND_WINDOW':
        postMessage({ type: 'LOG', message: `(Sender): Manually resending window from ${base} to ${nextseqnum - 1}.`});
        // Resend all packets in the current window and restart the timer
        for (let i = base; i < nextseqnum; i++) {
            postMessage({ type: 'SEND_PACKET', packet: { seq: i } });
        }
        if (base < nextseqnum) {
            startTimer();
        }
        break;

    case 'RECEIVE_ACK':
      if (payload.ack >= base) {
        base = payload.ack + 1;
        
        if (base === nextseqnum) {
          stopTimer();
          if (base === totalPackets) {
             postMessage({ type: 'LOG', message: `(Sender): ⭐️ All packets acknowledged!` });
          }
        } else {
          startTimer();
        }
        postMessage({ type: 'STATE_UPDATE', base, nextseqnum });
      }
      break;
  }
};