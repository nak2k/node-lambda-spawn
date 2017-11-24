const {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
} = require('./constants');

function main() {
  if (!process.connected) {
    console.error('IPC channel not exists.');
    process.exit(1);
  }

  console.info('Lambda process started.');

  /**
   * Initialize a current process.
   */
  process.on('exit', code => {
    console.info('Lambda process exits with code %d', code);
  });

  process.on('message', function(message, sendHandle) {
    const { type } = message;
    this.emit(type, message);
  });

  process.on(INIT, initHandler);
  process.on(INVOKE, invokeHandler);
}

function initHandler(message) {
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
      sendLastMessage(this, setError({ type: INIT_RESULT }, err));
      return;
    }
  }

  this.send({
    type: INIT_RESULT,
    err: null,
  });
}

function invokeHandler(message) {
  runLambda(message, (err, result) =>
    sendLastMessage(this,
      setError({
        type: INVOKE_RESULT,
        result,
      }, err)
    )
  );
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
  const {
    module,
    handlerName,
    event,
    context,
  } = options;

  let lambdaModule;

  try {
    lambdaModule = require(module);
  } catch (err) {
    return callback(err);
  }

  const handler = lambdaModule[handlerName];

  if (typeof handler !== 'function') {
    return callback(new Error(`Module '${module}' does not export the handler '${handlerName}'.`));
  }

  handler(event, context, callback);
}

main();
