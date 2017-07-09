const {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
} = require('./constants');

function setListeners(process) {
  process.on('exit', code => {
    console.info('Lambda process exits with code %d', code);
  });

  process.on('message', (message, sendHandle) => {
    const { type } = message;

    if (type === INIT) {
      const {
        region,
        awsSdkPath,
      } = message;

      console.info('aws-sdk: %s', awsSdkPath);

      if (awsSdkPath) {
        try {
          const AWS = require(awsSdkPath);
          AWS.config.update({
            region,
          });
        } catch (err) {
          sendLastMessage(process, setError({ type: INIT_RESULT }, err));
          return;
        }
      }

      return process.send({
        type: INIT_RESULT,
        err: null,
      });
    } else if (type === INVOKE) {
      runLambda(message, (err, result) =>
        sendLastMessage(process,
          setError({
            type: INVOKE_RESULT,
            result,
          }, err)
        )
      );
    }
  });
}

/*
 * Send a message and disconnect regardless of success or failure.
 */
function sendLastMessage(process, message) {
  process.send(message, err => process.disconnect());
}

function setError(obj, err) {
  if (err) {
    obj.err = {
      code: err.code,
      message: err.message,
      stack: err.stack,
    }
  }

  return obj;
}

function runLambda(options, callback) {
  const lambdaModule = require(options.module);
  const handler = lambdaModule[options.handlerName];

  const { event, context } = options;

  handler(event, context, callback);
}

setListeners(process);

console.info('Lambda process started.');

if (!process.connected) {
  console.error('IPC channel not exists.');
  process.exit(1);
}
