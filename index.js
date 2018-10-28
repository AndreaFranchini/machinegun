'use strict';

const _ = require('lodash');

const { loadAmmunition } = require('./lib/loader');
const { countVictims } = require('./lib/counter');
const { httpRequest } = require('./lib/request');

const CHECK_STRAY_BULLETS = 250;

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
  const response = await httpRequest(request);

  if (asBrowser) {
    const paths = getResourcePaths(response.data);
    const resourceRequests = paths.map((path) => {
      const resourceRequest = _.cloneDeep(request);
      resourceRequest.path = path;
      return fire(resourceRequest, asBrowser);
    });
    await Promise.all(resourceRequests);
  }

  delete response.data;
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
  });
}

function showReport(warGround, strayBullets, requests) {
  console.log('\nWar Journal:');
  console.log({
    durationInSec: parseInt((Date.now() - process.env.START_TIME) / 1000, 10),
    ammunitionLeft: requests.length,
    fired: warGround.length,
    strayBullets: strayBullets.number,
  });
}

function endWar(warGround, rps, reportPath) {
  const report = countVictims(warGround, rps, reportPath);
  console.log('\nWar Report:');
  console.log(report);
  process.exit();
}

async function startWar(strategy) {
  const warGround = [];
  const strayBullets = {
    number: 0,
  };

  // if no pathsFrom provided load infinity default request
  const requests = await loadAmmunition(strategy.request.default, strategy.request.pathsFrom);

  process.env.START_TIME = Date.now();

  const journal = setInterval(() => {
    showReport(warGround, strayBullets, requests);
  }, strategy.reportFrequency * 1000);

  const firing = setInterval(async () => {
    const bullet = requests.pop();

    // OUT OF AMMO
    if (!bullet) {
      clearInterval(firing);
      console.log('\nFire ceased - out of ammo');
      process.env.STOP_FIRE_TIME = Date.now();
      await wait(strayBullets);
      process.env.END_TIME = Date.now();
      clearInterval(journal);
      endWar(warGround, strategy.requestPerSecond, strategy.reportPath);
    }

    strayBullets.number += 1;

    fire(bullet, strategy.requestAsBrowser)
      .then((victim) => {
        warGround.push(victim);
        strayBullets.number -= 1;
      });
  }, (1 / strategy.requestPerSecond) * 1000);

  // DEADLINE
  setTimeout(async () => {
    clearInterval(firing);
    console.log('\nFire ceased - temporal deadline');
    process.env.STOP_FIRE_TIME = Date.now();
    await wait(strayBullets);
    process.env.END_TIME = Date.now();
    clearInterval(journal);
    endWar(warGround, strategy.requestPerSecond, strategy.reportPath);
  }, strategy.duration * 1000);

  // MANUAL STOP
  process.on('SIGINT', async () => {
    clearInterval(firing);
    console.log('\nFire ceased - manual stop');
    process.env.STOP_FIRE_TIME = Date.now();
    await wait(strayBullets);
    process.env.END_TIME = Date.now();
    clearInterval(journal);
    endWar(warGround, strategy.requestPerSecond, strategy.reportPath);
  });
}

module.exports = {
  startWar,
};
