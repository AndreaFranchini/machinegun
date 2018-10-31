'use strict';

const http = require('http');

const REQUEST_TIMEOUT = 15000;

function httpRequest(options) {
  return new Promise((resolve, reject) => {
    // Request setup
    const request = http.request(options, (resp) => {
      resp.setEncoding('utf8');
      let data = '';

      resp.on('data', (chunk) => {
        data += chunk;
      });

      resp.on('end', () => {
        resolve({
          status: resp.statusCode,
          data,
        });
      });
    });

    request.on('error', (error) => {
      // General error, i.e.
      //  - ECONNRESET - server closed the socket unexpectedly
      //  - ECONNREFUSED - server did not listen
      //  - HPE_INVALID_VERSION
      //  - HPE_INVALID_STATUS
      //  - ... (other HPE_* codes) - server returned garbage
      reject(error);
    });
    
    request.on('timeout', () => {
      // Timeout happend. Server received request, but not handled it
      // (i.e. doesn't send any response or it took to long).
      // You don't know what happend.
      // It will emit 'error' message as well (with ECONNRESET code).
      request.abort();
      reject(new Error('timeout'));
    });
    
    request.setTimeout(REQUEST_TIMEOUT);

    // Request socket setup
    // const socket = request.connection;
    // socket.setKeepAlive(false);

    // // Emitted when the other end of the socket sends a FIN packet, thus ending the readable side of the socket.
    // socket.on('end', () => {
    //   // Ensures that no more I/O activity happens on this socket
    //   socket.destroy();
    // });

    // if (request.body) {
    //   req.write(request.body);
    // }

    // Finishes sending the request. If any parts of the body are unsent, it will flush them to the stream.
    // If the request is chunked, this will send the terminating '0\r\n\r\n'.
    // If data is specified, it is equivalent to calling request.write(data, encoding) followed by request.end(callback).
    request.end();
  });
}

module.exports = {
  httpRequest,
};
