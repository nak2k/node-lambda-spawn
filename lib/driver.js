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
    this.emit(message.type, message);
  });

  process.on(INIT, initHandler);
  process.on(INVOKE, invokeHandler);
}

function initHandler(message) {
  const {
    region,
    awsSdkPath,
    arn,
    module,
    handlerName,
  } = message;

  if (arn) {
    process.title = arn;
  }

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

  let lambdaModule;

  try {
    lambdaModule = require(module);
  } catch (err) {
    sendLastMessage(this, setError({ type: INIT_RESULT }, err));
    return;
  }

  const lambdaHandler = lambdaModule[handlerName];

  if (typeof lambdaHandler !== 'function') {
    const err = new Error(`Module '${module}' does not export the handler '${handlerName}'.`);
    sendLastMessage(this, setError({ type: INIT_RESULT }, err));
    return;
  }

  this.lambdaHandler = lambdaHandler;

  this.send({
    type: INIT_RESULT,
    err: null,
  });
}

function invokeHandler(message) {
  const {
    event,
    context,
  } = message;

  this.lambdaHandler(event, context, (err, result) =>
    this.send(setError({
      type: INVOKE_RESULT,
      msgId: message.msgId,
      result,
    }, err), err => {
      if (err) {
        this.disconnect();
      }
    })
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

main();
