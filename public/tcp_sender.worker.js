// public/tcp_sender.worker.js
let N = 1; // Congestion window size
let ssthresh = 4; // Slow start threshold
let base = 0;
let windowBase = 0;
let nextseqnum = 0;
let totalPackets;
let timeoutDuration;
let acksReceivedForCurrentWindow = 0;
var requiredWindowSize = N;
let phase = 'slow_start'; // slow_start, aimd

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
      if(phase === 'slow_start') ssthresh = Math.max(1, Math.floor(N / 2));
      if(phase === 'slow_start') requiredWindowSize = 1;
      if(phase == 'aimd') requiredWindowSize = Math.max(1, Math.floor(N / 2));
      acksReceivedForCurrentWindow = 0;
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
      postMessage({ type: 'LOG', message: `(Sender): TIMEOUT for packets starting from base ${base}. ssthresh is now ${ssthresh} and cwnd is ${N}.` });
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
      totalPackets = payload.totalPackets;
      timeoutDuration = payload.timeoutDuration;
      ssthresh = payload.ssthresh;
      base = 0;
      windowBase = 0;
      nextseqnum = 0;
      stopTimer();
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
      break;

    case 'SEND_WINDOW':
      if(N !== requiredWindowSize) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please adjust the window size before sending packets!` })
        return;
      }
      if (windowBase !== base) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please move the window!` });
      } else {
        for (let i = windowBase; i < windowBase + N && i < totalPackets; i++) {
          if (i >= nextseqnum) {
            if (base === nextseqnum) {
              startTimer();
            }
            postMessage({ type: 'SEND_PACKET', packet: { seq: i } });
            nextseqnum++;
            postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
          } else {
            postMessage({ type: 'LOG', message: `(Sender): 🔴 Packet ${i} already sent, please use resend window or move window!` });
            break;
          }
        }
      }
      break;

    case 'MOVE_WINDOW':
      if (windowBase < base) {
        windowBase += 1;
        postMessage({ type: 'LOG', message: `(Sender): Window moved to start at packet ${windowBase}.` });
        postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
      } else {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Cannot move window beyond base ${base}.` });
      }
      break;

    case 'RESEND_WINDOW':
      if(N !== requiredWindowSize) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please adjust the window size before resending packets!` })
        return;
      }
      postMessage({ type: 'LOG', message: `(Sender): Resending window from ${base} to ${nextseqnum - 1}.` });
      for (let i = base; i < Math.min(base + N, nextseqnum); i++) {
        postMessage({ type: 'SEND_PACKET', packet: { seq: i } });
      }
      if (base < nextseqnum) {
        startTimer();
      }
      break;

    case 'RECEIVE_ACK':
      if (payload.ack >= base) {
        acksReceivedForCurrentWindow++;
        if (acksReceivedForCurrentWindow >= N) {
          if(phase === 'slow_start') {
            requiredWindowSize *= 2;
            if(requiredWindowSize >= ssthresh) {
              phase = 'aimd';
              postMessage({ type: 'LOG', message: `(Sender): ⭐️ Transitioning to AIMD phase.` });
              postMessage({ type: 'STATE_UPDATE', newPhase: phase});
            }
          }
          else if(phase === 'aimd') requiredWindowSize +=1;
          acksReceivedForCurrentWindow = 0;
        }

        base = payload.ack + 1;

        if (base === nextseqnum) {
          stopTimer();
          if (base === totalPackets) {
            postMessage({ type: 'LOG', message: `(Sender): ⭐️ All packets acknowledged!` });
            phase = 'closure';
            postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
            return;
          }
        } else {
          startTimer();
        }
        postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize, phase });
      }
      break;

    case 'INCREASE_WINDOW_MANUAL':
      N++;
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
      break;

    case 'DECREASE_WINDOW_MANUAL':
      if(N <= 1) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Window size cannot be less than 1.` });
        return;
      }
      N--;
      if(phase === 'slow_start') ssthresh = Math.max(1, Math.floor(N / 2));
      if (phase !== 'aimd') {
        phase = 'slow_start';
      }
      postMessage({ type: 'LOG', message: `(Sender): Window size manually decreased to ${N}, ssthreshold set to ${ssthresh}.` });
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase, newRequiredWindowSize: requiredWindowSize });
      break;
  }
};