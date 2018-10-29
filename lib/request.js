'use strict';

const http = require('http');

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

    request.on('error', (err) => {
      reject(err);
    });

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
