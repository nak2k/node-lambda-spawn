const { spawn } = require('child_process');
const { join } = require('path');
const {
  INIT,
  INIT_RESULT,
  INVOKE,
  INVOKE_RESULT,
  PROCESS_EXIT,
} = require('./constants');
const { makeOnceCallback } = require('./makeOnceCallback');
const { findAwsSdk } = require('./findAwsSdk');

const debug = require('debug')('lambda-spawn:spawnLambda');

const spawnLambda = (options, event, context, callback) => {
  callback = makeOnceCallback(callback);

  const {
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

  const lambdaProcess = spawnProcess(command, args, spawnOptions, (err, lambdaProcess, message) => {
    if (err) {
      return callback(err, null);
    }

    const { type } = message;

    if (type === INIT_RESULT) {
      const { err } = message;

      if (err) {
        return callback(err, null);
      }

      const [moduleBasename, handlerName] = handler.split('.');

      const invokeMessage = {
        type: INVOKE,
        module: join(moduleDir, `${moduleBasename}.js`),
        handlerName,
        event,
        context,
      };

      lambdaProcess.send(invokeMessage);
      return;
    } else if (type === INVOKE_RESULT) {
      const { err, result } = message;

      return callback(err, result);
    } else if (type === PROCESS_EXIT) {
      return callback(new Error('Lambda process exited'), null);
    } else {
      return callback(new Error('Lambda returned an unknown message'), null);
    }
  });

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

    lambdaProcess.send({
      type: INIT,
      region,
      awsSdkPath,
    });
  });

  return lambdaProcess;
}

function spawnProcess(command, args, options, callback) {
  const lambdaProcess = spawn(command, args, options);

  setListeners(lambdaProcess, (err, result) => {
    callback(err, lambdaProcess, result);
  });

  return lambdaProcess;
}

function setListeners(process, callback) {
  process.on('close', (code, signal) => {
    debug('Lambda process closed. code = %d, signal = %s', code, signal);
  });

  process.on('disconnect', () => {
    debug('Lambda process disconnected');
  });

  process.on('error', err => {
    callback(err, null);
  });

  process.on('exit', (code, signal) => {
    debug('Lambda process exited. code = %d, signal = %s', code, signal);

    callback(null, {
      type: PROCESS_EXIT,
    });
  });

  process.on('message', (message, sendHandle) => {
    debug('Lambda process returns a result %j', message);

    callback(null, message);
  });
}

exports.spawnLambda = spawnLambda;
