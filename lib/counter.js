'use strict';

const fs = require('fs');

function formatTime(ms) {
  return (new Date(ms)).toString().split(' ')[4]
}

function compareByTime(a, b) {
  if (a.time < b.time) {
    return -1;
  }
  if (a.time > b.time) {
    return 1;
  }
  return 0;
}

function countVictims(ground, strategy, rpsHistory) {
  const count = {
    status100: 0,
    status200: 0,
    status300: 0,
    status400: 0,
    status500: 0,
  };

  let totalReqTime = 0;

  fs.writeFileSync(strategy.reportFile, '');

  const dataToWrite = [];
  let bunch = [];
  let bunchTime;

  ground.sort(compareByTime);
  ground.forEach((victim) => {
    switch (victim.status.toString()[0]) {
      case '1': count.status100 += 1; break;
      case '2': count.status200 += 1; break;
      case '3': count.status300 += 1; break;
      case '4': count.status400 += 1; break;
      case '5': count.status500 += 1;
                console.log('victim.data');
                console.log(formatTime(victim.time));
                console.log(victim.data);
                break;
      default: break;
    }

    totalReqTime += victim.latency;

    if (bunch.length === 0) {
      bunch.push(victim.latency);
      bunchTime = formatTime(victim.time);
    }

    const victimTime = formatTime(victim.time);

    // console.log('bunchTime', bunchTime);
    // console.log('victimTime', victimTime);
    // console.log('bunchTime == victimTime', bunchTime == victimTime);

    if (bunchTime == victimTime) {
      bunch.push(victim.latency);
    } else {
      const bunchTotalLatency = bunch.reduce((a, b) => a + b, 0);
      const bunchMediumLatency = parseInt(bunchTotalLatency / bunch.length, 10);
      const bunchMaxLatency = Math.max(...bunch);
      const bunchMinLatency = Math.min(...bunch);

      dataToWrite.push({
        time: bunchTime,
        min: bunchMinLatency,
        avg: bunchMediumLatency,
        max: bunchMaxLatency,
      });

      bunch = [];
      bunchTime = victimTime;
      bunch.push(victim.latency);
    }
  });

  // when ending i shuold push the remaining data of the bunch into dataToWrite
  // then

  bunch = [];

  if (strategy.raiseTo) {
    rpsHistory.sort(compareByTime);
    rpsHistory.forEach((obj) => {
      if (bunch.length === 0) {
        bunch.push(obj.rps);
        bunchTime = formatTime(obj.time);
      }

      const objTime = formatTime(obj.time);

      if (objTime === bunchTime) {
        bunch.push(obj.rps);
      } else {
        const bunchTotalRps = bunch.reduce((a, b) => a + b, 0);
        const bunchMediumRps = parseInt(bunchTotalRps / bunch.length, 10);

        const index = dataToWrite.findIndex(data => data.time === bunchTime);
        if (dataToWrite[index]) {
          dataToWrite[index].avgrps = bunchMediumRps;
        }

        bunch = [];
        bunchTime = objTime;
        bunch.push(obj.rps);
      }
    });
  }
  // when ending i shuold push the remaining data of the bunch into dataToWrite
  // then

  dataToWrite.sort(compareByTime);
  dataToWrite.forEach((data) => {
    let line = `${data.time};${data.min};${data.avg};${data.max}`;
    if (data.avgrps) {
      line += `;${data.avgrps}`;
    }
    line += '\n';
    fs.appendFileSync(strategy.reportFile, line);
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
