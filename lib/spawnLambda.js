const { spawn } = require('child_process');
const { join } = require('path');
const {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
} = require('./constants');
const { makeOnceCallback } = require('./makeOnceCallback');
const { findAwsSdk } = require('./findAwsSdk');

const debug = require('debug')('lambda-spawn:spawnLambda');

const spawnLambda = (options, event, context) => {
  const {
    arn,
    dir = process.cwd(),
    handler = 'index.handler',
    region = process.env.AWS_REGION,
    command = 'node',
    args = [join(__dirname, 'driver.js')],
    env,
    lambdaEnv,
    additionalNodePath,
    stdio = ['ignore', 'inherit', 'inherit'],
    babel,
  } = options;

  const {
    moduleDir = dir,
  } = options;

  const [, stdout = 'inherit', stderr = 'inherit'] = stdio;

  if (babel) {
    args.unshift('-r', 'babel-register');
  }

  const spawnOptions = {
    cwd: dir,
    env: lambdaEnv ? Object.assign({}, env || process.env, lambdaEnv) : env,
    stdio: ['ignore', stdout, stderr, 'ipc'],
  };

  if (additionalNodePath) {
    if (spawnOptions.env === undefined) {
      spawnOptions.env = Object.assign({}, process.env);
    }

    const { NODE_PATH } = spawnOptions.env;

    spawnOptions.env.NODE_PATH = NODE_PATH
      ? NODE_PATH + ':' + additionalNodePath
      : additionalNodePath;
  }

  const lambdaProcess = spawnProcess(command, args, spawnOptions);
  lambdaProcess.arn = arn;

  findAwsSdk({
    basedir: moduleDir,
    NODE_PATH: spawnOptions.env && spawnOptions.env.NODE_PATH,
  }, (err, awsSdkPath) => {
    if (!awsSdkPath) {
      try {
        awsSdkPath = require.resolve('aws-sdk');
      } catch (err) {
        // Ignore error.
      }
    }

    const [moduleBasename, handlerName] = handler.split('.');

    lambdaProcess.send({
      type: INIT,
      region,
      awsSdkPath,
      arn,
      module: join(moduleDir, `${moduleBasename}.js`),
      handlerName,
    });
  });

  return lambdaProcess;
}

function spawnProcess(command, args, options) {
  const process = spawn(command, args, options);
  process.msgId = 0;

  process.on('close', (code, signal) => {
    debug('Lambda process closed. code = %d, signal = %s', code, signal);
  });

  process.on('disconnect', () => {
    debug('Lambda process disconnected');
  });

  process.on('error', err => {
    debug('Lambda process error. err = %j', err);
  });

  process.on('exit', (code, signal) => {
    debug('Lambda process exited. code = %d, signal = %s', code, signal);
  });

  process.on('message', function(message, sendHandle) {
    debug('Lambda process returns a result %j', message);

    this.emit(message.type, message);
  });

  process.invoke = function(event, context, callback) {
    callback = makeOnceCallback(callback);

    const invokeContext = {};

    invokeContext.msgId = ++this.msgId;

    invokeContext.resultHandler = message => {
      if (message.msgId !== invokeContext.msgId) {
        return;
      }

      callback(message.err, message.result);

      invokeContext.destroy();
    };

    invokeContext.exitHandler = (code, signal) => {
      callback(new Error(`Lambda process exited. code = ${code}, signal = ${signal}`));

      invokeContext.destroy();
    };

    invokeContext.destroy = () => {
      this.removeListener(INVOKE_RESULT, invokeContext.resultHandler);
      this.removeListener('exit', invokeContext.exitHandler);

      delete invokeContext.resultHandler;
      delete invokeContext.exitHandler;
      delete invokeContext.destroy;
    };

    this.on(INVOKE_RESULT, invokeContext.resultHandler);
    this.on('exit', invokeContext.exitHandler);

    const invokeMessage = {
      type: INVOKE,
      event,
      context,
      msgId: invokeContext.msgId,
    };

    this.send(invokeMessage, err => {
      if (err) {
        callback(err);

        invokeContext.destroy();
      }
    });
  };

  return process;
}

/**
 * Exports.
 */
exports.spawnLambda = spawnLambda;
