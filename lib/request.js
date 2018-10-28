'use strict';

const http = require('http');

function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // if (request.body) {
    //   req.write(request.body);
    // }

    req.end();
  });
}

module.exports = {
  httpRequest,
};
