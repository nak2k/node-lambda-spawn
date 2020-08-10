import {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
} from './constants';

interface ProcessWithLambdaHandler extends NodeJS.Process {
  lambdaHandler(event: any, context: any): Promise<any>;
  lambdaHandler(event: any, context: any, callback: (err: Error | null, result?: any) => void): void;
}

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

  process.on('message', function (this: NodeJS.Process, message, sendHandle) {
    this.emit(message.type, message);
  });

  process.on(INIT, initHandler);
  process.on(INVOKE, invokeHandler);
}

function initHandler(this: ProcessWithLambdaHandler, message: any) {
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

  this.send!({
    type: INIT_RESULT,
    err: null,
  });
}

function invokeHandler(this: ProcessWithLambdaHandler, message: any) {
  const {
    event,
    context,
  } = message;

  if (this.lambdaHandler.length === 3) {
    this.lambdaHandler(event, context, (err: Error | null, result?: any) =>
      this.send!(setError({
        type: INVOKE_RESULT,
        msgId: message.msgId,
        result,
      }, err), (err: Error) => {
        if (err) {
          this.disconnect();
        }
      })
    );
  } else {
    this.lambdaHandler(event, context)
      .then(result => {
        this.send!({
          type: INVOKE_RESULT,
          msgId: message.msgId,
          result,
        }, (err: Error) => {
          if (err) {
            this.disconnect();
          }
        });
      })
      .catch(err => {
        this.send!(setError({
          type: INVOKE_RESULT,
          msgId: message.msgId,
        }, err), (err: Error) => {
          if (err) {
            this.disconnect();
          }
        })
      });
  }
}

/*
 * Send a message and disconnect regardless of success or failure.
 */
function sendLastMessage(process: NodeJS.Process, message: any) {
  process.send!(message, (err: Error) => process.disconnect());
}

function setError(obj: any, err?: Error | null) {
  if (err) {
    obj.err = {
      code: (err as any).code,
      message: err.message,
      stack: err.stack,
    }
  }

  return obj;
}

main();
