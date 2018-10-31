'use strict';

const _ = require('lodash');

const { loadAmmunition } = require('./lib/loader');
const { countVictims } = require('./lib/counter');
const { httpRequest } = require('./lib/request');

const CHECK_STRAY_BULLETS = 250;
const CHECK_STRAY_DEADLINE = 15000;
const RPS_UPDATE = 500; // better if less than 1000

function getResourcePaths(data) {
  const lines = data.split('\n');
  const srcTag = lines.filter(line => line.includes('src=') || line.includes('href='));
  const resTag = srcTag.filter(tag => tag.includes('js') || tag.includes('css'));
  const localSrc = resTag.filter(res => !res.includes('//'));
  const extractor = new RegExp('(/.*.css)|(/.*.js)');
  const paths = localSrc.map(res => res.match(extractor)[0]);
  return paths;
}

async function fire(request, asBrowser) {
  const start = Date.now();
  let response;
  try {
    response = await httpRequest(request);
  } catch (err) {
    console.log('httpRequest error');
    console.log(err);
    return {
      status: 500,
      data: err.message,
    }
  }

  if (asBrowser) {
    const paths = getResourcePaths(response.data);
    const resourceRequests = paths.map((path) => {
      const resourceRequest = _.cloneDeep(request);
      resourceRequest.path = path;
      return fire(resourceRequest, asBrowser);
    });
    await Promise.all(resourceRequests);
  }

  if (response.status.toString()[0] === '2') {
    delete response.data;
  }
  
  response.latency = Date.now() - start;
  response.time = start;

  return response;
}

function wait(strayBullets) {
  return new Promise((resolve) => {
    setInterval(() => {
      if (strayBullets.number === 0) {
        resolve();
      }
    }, CHECK_STRAY_BULLETS);
    setTimeout(() => resolve(), CHECK_STRAY_DEADLINE);
  });
}

function showReport(warGround, strayBullets, requests, actualRps) {
  console.log('\nWar Journal:');
  console.log({
    durationInSec: parseInt((Date.now() - process.env.START_TIME) / 1000, 10),
    ammunitionLeft: requests.length,
    fired: warGround.length,
    strayBullets: strayBullets.number,
    actualRps,
  });
}

function endWar(warGround, strategy, rpsHistory) {
  const report = countVictims(warGround, strategy, rpsHistory);
  console.log('\nWar Report:');
  console.log(report);
  process.exit();
}

async function startWar(strategy) {
  const warGround = [];
  const strayBullets = {
    number: 0,
  };

  let rps = _.clone(strategy.requestPerSecond);

  // Dynamic RPS
  let rpsHistory = [{
    time: Date.now(),
    rps,
  }];
  let updateRPS;
  if (strategy.raiseTo) {
    const raiseTo = strategy.raiseTo ? strategy.raiseTo : 0;
    const m = Number(((raiseTo - rps) / (strategy.duration - 1)).toFixed(2));
    updateRPS = setInterval(() => {
      rps = Number((rps + (m * (RPS_UPDATE / 1000))).toFixed(2));
      rpsHistory.push({
        time: Date.now(),
        rps,
      });
    }, RPS_UPDATE);
  }

  // if no pathsFrom provided load infinity default request
  const requests = await loadAmmunition(strategy.request.default, strategy.request.pathsFrom);

  process.env.START_TIME = Date.now();

  const journal = setInterval(() => {
    showReport(warGround, strayBullets, requests, rps);
  }, strategy.reportFrequency * 1000);

  let takeAim;
  const firing = async () => {
    const bullet = requests.pop();

    // OUT OF AMMO
    if (!bullet) {
      console.log('\nFire ceased - out of ammo');
      clearInterval(updateRPS);
      process.env.STOP_FIRE_TIME = Date.now();
      await wait(strayBullets);
      process.env.END_TIME = Date.now();
      clearInterval(journal);
      endWar(warGround, strategy, rpsHistory);
    }

    strayBullets.number += 1;

    fire(bullet, strategy.requestAsBrowser)
      .then((victim) => {
        warGround.push(victim);
        strayBullets.number -= 1;
      });

    takeAim = setTimeout(firing, (1 / rps) * 1000);
  };
  firing();

  // DEADLINE
  setTimeout(async () => {
    clearTimeout(takeAim);
    clearInterval(updateRPS);
    console.log('\nFire ceased - temporal deadline');
    process.env.STOP_FIRE_TIME = Date.now();
    await wait(strayBullets);
    process.env.END_TIME = Date.now();
    clearInterval(journal);
    endWar(warGround, strategy, rpsHistory);
  }, strategy.duration * 1000);

  // MANUAL STOP
  process.on('SIGINT', async () => {
    clearTimeout(takeAim);
    clearInterval(updateRPS);
    console.log('\nFire ceased - manual stop');
    process.env.STOP_FIRE_TIME = Date.now();
    await wait(strayBullets);
    process.env.END_TIME = Date.now();
    clearInterval(journal);
    endWar(warGround, strategy, rpsHistory);
  });
}

module.exports = {
  startWar,
};
