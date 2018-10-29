'use strict';

const fs = require('fs');

function countVictims(ground, strategy) {
  const count = {
    status100: 0,
    status200: 0,
    status300: 0,
    status400: 0,
    status500: 0,
  };

  let totalReqTime = 0;

  function compare(a, b) {
    if (a.time < b.time) {
      return -1;
    }
    if (a.time > b.time) {
      return 1;
    }
    return 0;
  }

  ground.sort(compare);

  fs.writeFileSync(strategy.reportPath, '');

  let bunch = [];
  let bunchDateSeconds;

  ground.forEach((victim) => {
    switch (victim.status.toString()[0]) {
      case '1': count.status100 += 1; break;
      case '2': count.status200 += 1; break;
      case '3': count.status300 += 1; break;
      case '4': count.status400 += 1; break;
      case '5': count.status500 += 1;
                console.log('victim.data');
                console.log(victim.data);
                break;
      default: break;
    }

    totalReqTime += victim.latency;

    if (bunch.length === 0) {
      bunch.push(victim.latency);
      bunchDateSeconds = parseInt(victim.time / 1000, 10);
    }

    const victimDateSeconds = parseInt(victim.time / 1000, 10);

    if (victimDateSeconds === bunchDateSeconds) {
      bunch.push(victim.latency);
    } else {
      const bunchTime = (new Date(bunchDateSeconds * 1000)).toString().split(' ')[4];
      const bunchTotalLatency = bunch.reduce((a, b) => a + b, 0);
      const bunchMediumLatency = parseInt(bunchTotalLatency / bunch.length, 10);
      const bunchMaxLatency = Math.max(...bunch);
      const bunchMinLatency = Math.min(...bunch);

      fs.appendFileSync(strategy.reportPath, `${bunchTime};${bunchMinLatency};${bunchMediumLatency};${bunchMaxLatency}\n`);
      bunch = [];
    }
  });

  const start = Number(process.env.START_TIME);
  const stopFire = Number(process.env.STOP_FIRE_TIME);
  const end = Number(process.env.END_TIME);

  const time = {
    start: (new Date(start)).toISOString(),
    end: (new Date(end)).toISOString(),
    duration: {
      total: Number(((end - start) / 1000).toFixed(1)),
      fire: Number(((stopFire - start) / 1000).toFixed(1)),
      waitPending: Number(((end - stopFire) / 1000).toFixed(1)),
    },
  };

  const request = {
    perSecond: strategy.requestPerSecond,
    raiseTo: strategy.raiseTo,
    landedPerSecond: Number((ground.length / time.duration.fire).toFixed(3)),
    landed: ground.length,
  };

  return {
    time,
    request,
    count,
    averageReqTime: Number((totalReqTime / ground.length).toFixed(3)),
  };
}

module.exports = {
  countVictims,
};
