const {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
} = require('./constants');

function error(message, ...args) {
  console.error(`Error: ${message}`, ...args);
}

function info(message, ...args) {
  console.info(`Info: ${message}`, ...args);
}

function setListeners(process) {
  process.on('exit', code => {
    info('Process exits with code %d', code);
  });

  process.on('message', (message, sendHandle) => {
    info('Message received. %j', message);

    const { type } = message;

    if (type === INIT) {
      try {
        const AWS = require('aws-sdk');
        AWS.config.update({
          region,
        });
      } catch (err) {
        process.send({
          type: INIT_RESULT,
          err,
        });
        return;
      }

      return prcess.send({
        type: iNIT_RESULT,
        err: null,
      });
    } else if (type === INVOKE) {
      return runLambda(message, (err, result) => {
        process.send({
          type: INVOKE_RESULT,
          err,
          result,
        });

        process.disconnect();
      });
    }
  });
}

function runLambda(options, callback) {
  const lambdaModule = require(options.module);
  const handler = lambdaModule[options.handlerName];

  const { event, context } = options;

  handler(event, context, callback);
}

setListeners(process);

info('Driver started.');

if (!process.connected) {
  error('IPC channel not exists.');
  process.exit(1);
}
