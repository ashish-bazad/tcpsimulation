// public/tcp_sender.worker.js
let N = 1; // Congestion window size
let ssthresh = 8; // Slow start threshold
let base = 0;
let windowBase = 0;
let nextseqnum = 0;
let totalPackets;
let timeoutDuration;
let acksReceivedForCurrentWindow = 0;
let manualIncrease = false;
let manualDecrease = false;
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
      ssthresh = Math.max(1, Math.floor(N / 2));
      N = 1;
      phase = 'slow_start';
      manualDecrease = true;
      acksReceivedForCurrentWindow = 0;
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      postMessage({ type: 'LOG', message: `(Sender): TIMEOUT for packets starting from base ${base}. ssthresh is now ${ssthresh} and cwnd is ${N}. Entering Slow Start.` });
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
      base = 0;
      windowBase = 0;
      nextseqnum = 0;
      stopTimer();
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      break;

    case 'SEND_WINDOW':
      if (manualIncrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please increase the window size before sending more packets!` });
        return;
      }
      if (manualDecrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please decrease the window size before sending more packets!` });
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
            postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
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
        postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      }
      break;

    case 'RESEND_WINDOW':
      if (manualIncrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please increase the window size before sending more packets!` });
        return;
      }
      if (manualDecrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Please decrease the window size before sending more packets!` });
        return;
      }
      postMessage({ type: 'LOG', message: `(Sender): Resending window from ${base} to ${nextseqnum - 1}.` });
      for (let i = base; i < nextseqnum; i++) {
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
          manualIncrease = true;
          acksReceivedForCurrentWindow = 0;
        }

        base = payload.ack + 1;

        if (base === nextseqnum) {
          stopTimer();
          if (base === totalPackets) {
            postMessage({ type: 'LOG', message: `(Sender): ⭐️ All packets acknowledged!` });
          }
        } else {
          startTimer();
        }
        postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      }
      break;

    case 'INCREASE_WINDOW_MANUAL':
      if (manualDecrease || !manualIncrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Cannot increase window size now!` });
        return;
      }
      if (phase === 'slow_start') {
        N *= 2;
        postMessage({ type: 'LOG', message: `(Sender): Full window ACK'd. cwnd doubles to ${N}.` });
        if (N >= ssthresh) {
          phase = 'aimd';
          postMessage({ type: 'LOG', message: `(Sender): ssthresh reached. Entering AIMD phase.` });
        }
      } else { // AIMD phase
        N++;
        postMessage({ type: 'LOG', message: `(Sender): Full window ACK'd. cwnd increments to ${N}.` });
      }
      manualIncrease = false;
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      break;

    case 'DECREASE_WINDOW_MANUAL':
      if (manualIncrease || !manualDecrease) {
        postMessage({ type: 'LOG', message: `(Sender): 🔴 Cannot decrease window size now!` });
        return;
      }
      ssthresh = Math.max(1, Math.floor(N / 2));
      N = 1;
      phase = 'slow_start';
      postMessage({ type: 'LOG', message: `(Sender): Window size manually decreased to ${N}, ssthreshold set to ${ssthresh}. Entering Slow Start.` });
      manualDecrease = false;
      postMessage({ type: 'STATE_UPDATE', base, windowBase, nextseqnum, newWindowSize: N, newCongestionWindow: N, newSlowStartThreshold: ssthresh, newPhase: phase });
      break;
  }
};