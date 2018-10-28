'use strict';

const _ = require('lodash');
const fs = require('fs');
const readline = require('readline');

function loadAmmunition(defaultRequest, csvPath) {
  return new Promise((resolve) => {
    if (!csvPath) {
      return resolve({
        length: 'infinity',
        pop: () => defaultRequest,
      });
    }
    const requests = [];

    const lineReader = readline.createInterface({
      input: fs.createReadStream(csvPath),
    });

    lineReader.on('line', (line) => {
      const actualReq = _.cloneDeep(defaultRequest);
      actualReq.path = line;
      requests.push(actualReq);
    });

    lineReader.on('close', () => {
      resolve(requests);
    });
  });
}

module.exports = {
  loadAmmunition,
};
