let timer = null;

self.onmessage = function(e) {
  if (e.data.command === 'start') {
    // Start the timer: tick every 1s, no initial delay
    timer = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, 1000);
  } else if (e.data.command === 'stop') {
    // Stop the timer
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};
