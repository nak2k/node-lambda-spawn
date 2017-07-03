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

const debug = require('debug')('lambda-spawn:spawnLambda');

const spawnLambda = (options, event, context, callback) => {
  callback = makeOnceCallback(callback);

  const {
    dir = process.cwd(),
    moduleDir,
    handler = 'index.handler',
    region = process.env.AWS_REGION,
    command = 'node',
    args = [join(__dirname, 'driver.js')],
    env,
    stdio = ['ignore', 'inherit', 'inherit'],
  } = options;

  const [, stdout = 'inherit', stderr = 'inherit'] = stdio;

  const spawnOptions = {
    cwd: dir,
    env,
    stdio: ['ignore', stdout, stderr, 'ipc'],
    initialMessage: {
      type: INIT,
      region,
    },
  };

  spawnProcess(command, args, spawnOptions, (err, lambdaProcess, message) => {
    if (err) {
      return callback(err, null);
    }

    const { type } = message;

    if (type === INIT_RESULT) {
      const [moduleBasename, handlerName] = handler.split('.');
      const module = join(moduleDir || dir, `${moduleBasename}.js`);

      const message = {
        type: INVOKE,
        module,
        handlerName,
        event,
        context,
      };

      lambdaProcess.send(message);
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
}

function spawnProcess(command, args, options, callback) {
  let lambdaProcess;

  try {
    lambdaProcess = spawn(command, args, options);
  } catch (e) {
    return callback(e, null, null);
  }

  setListeners(lambdaProcess, (err, result) => {
    callback(err, lambdaProcess, result);
  });

  lambdaProcess.send(options.initialMessage);
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
