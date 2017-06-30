const {
  INVOKE,
  RESULT,
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

    if (type === INVOKE) {
      return runLambda(message, (err, result) => {
        process.send({
          type: RESULT,
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
