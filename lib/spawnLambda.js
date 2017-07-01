const { spawn } = require('child_process');
const { join } = require('path');
const {
  INVOKE,
  RESULT,
} = require('./constants');

const debug = require('debug')('lambda-spawn:spawnLambda');

const spawnLambda = (options, event, context, callback) => {
  const {
    dir = process.cwd(),
    handler = 'index.handler',
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
  };

  let lambdaProcess;

  try {
    lambdaProcess = spawn(command, args, spawnOptions);
  } catch (e) {
    return callback(e, null);
  }

  setListeners(lambdaProcess, callback);

  const [moduleBasename, handlerName] = handler.split('.');
  const module = join(dir, `${moduleBasename}.js`);

  const message = {
    type: INVOKE,
    module,
    handlerName,
    event,
    context,
  };

  lambdaProcess.send(message);
}

function setListeners(process, callback) {
  let isCalled = false;
  const callbackOnce = (err, result) => {
    if (isCalled) {
      return;
    }

    isCalled = true;

    callback(err, result);
  };

  process.on('close', (code, signal) => {
    debug('Lambda process close. code = %d, signal = %s', code, signal);
  });

  process.on('disconnect', () => {
    debug('Lambda process disconnected');
  });

  process.on('error', err => {
    callbackOnce(err, null);
  });

  process.on('exit', (code, signal) => {
    debug('Lambda process exited. code = %d, signal = %s', code, signal);

    callbackOnce(null, null);
  });

  process.on('message', (message, sendHandle) => {
    debug('Lambda process returns a result %j', message);

    const { type } = message;

    if (type === RESULT) {
      const { err, result } = message;

      callbackOnce(err, result);
    }
  });
}

exports.spawnLambda = spawnLambda;
