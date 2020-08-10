import { spawn, ChildProcess } from 'child_process';
import { join, resolve } from 'path';
import {
  INIT,
  INVOKE,
  INVOKE_RESULT,
  DEFAULT_DRIVER_PATH,
} from './constants';
import { makeOnceCallback } from './makeOnceCallback';
import { findAwsSdk } from './findAwsSdk';

const debug = require('debug')('lambda-spawn:spawnLambda');

export interface LambdaProcess extends ChildProcess {
  arn?: string;
  _msgId: number;

  invoke(event: any, context: any, callback: (err: Error | null, result?: any) => void): void;
}

interface spawnLambdaOptions {
  /**
   * If this option is truthy, `ts-node` is used to launch a lambda process.
   */
  typescript?: boolean;

  /**
   * An ARN that identify a lambda process.
   */
  arn?: string;

  /**
   * A current directory of the lambda process. (Default: `process.cwd()`)
   */
  dir?: string;

  /**
   * Names of a module and a function. (Default: `index.handler`)
   */
  handler?: string;

  /**
   * A region that is used to initialize `aws-sdk` in a lambda process. (Default: `process.env.AWS_REGION`)
   */
  region?: string;

  command?: string;

  args?: string[];

  /**
   * An object of environment variables that is used to launch a lambda process. (Default: `process.env`)
   */
  env?: NodeJS.ProcessEnv;

  /**
   * An object of environment variables that is used as the lambda configuration.
   * This object is merged to `env`.
   */
  lambdaEnv?: NodeJS.ProcessEnv;

  additionalNodePath?: string;

  stdio?: any;

  babel?: boolean;

  /**
   * A path of a directory that the lambda function is located.
   */
  moduleDir?: string;

  project?: string;
}

export function spawnLambda(options: spawnLambdaOptions) {
  const {
    typescript,
  } = options;

  const {
    arn,
    dir = process.cwd(),
    handler = 'index.handler',
    region = process.env.AWS_REGION,
    command = typescript ? 'ts-node' : 'node',
    args = [DEFAULT_DRIVER_PATH],
    env,
    lambdaEnv,
    additionalNodePath,
    stdio = ['ignore', 'inherit', 'inherit'],
    babel,
    project,
  } = options;

  const {
    moduleDir = dir,
  } = options;

  const [, stdout = 'inherit', stderr = 'inherit'] = stdio;

  if (babel) {
    args.unshift('-r', 'babel-register');
  }

  if (project) {
    args.unshift('-P', project);
  }

  const mergedEnv = Object.assign({}, env || process.env, lambdaEnv);

  const {
    LAMBDA_TASK_ROOT = mergedEnv.LAMBDA_TASK_ROOT = moduleDir,
    LAMBDA_RUNTIME_DIR = mergedEnv.LAMBDA_RUNTIME_DIR = moduleDir,
  } = mergedEnv;

  mergedEnv.NODE_PATH = [
    mergedEnv.NODE_PATH,
    LAMBDA_RUNTIME_DIR,
    LAMBDA_TASK_ROOT,
    LAMBDA_RUNTIME_DIR + '/node_modules',
    additionalNodePath,
  ].filter(s => s).join(':');

  const spawnOptions = {
    cwd: dir,
    env: mergedEnv,
    stdio: ['ignore', stdout, stderr, 'ipc'],
  };

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
      module: join(resolve(moduleDir), moduleBasename + (typescript ? '.ts' : '.js')),
      handlerName,
    });
  });

  return lambdaProcess;
}

function spawnProcess(command: string, args?: ReadonlyArray<string>, options?: any) {
  const process = spawn(command, args, options) as LambdaProcess;
  process._msgId = 0;

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

  process.on('message', function (this: ChildProcess, message: any, sendHandle) {
    debug('Lambda process returns a result %j', message);

    this.emit(message.type, message);
  });

  process.invoke = function (event, context, callback) {
    callback = makeOnceCallback(callback);

    const invokeContext: any = {};

    invokeContext.msgId = ++this._msgId;

    invokeContext.resultHandler = (message: any) => {
      if (message.msgId !== invokeContext.msgId) {
        return;
      }

      callback(message.err, message.result);

      invokeContext.destroy();
    };

    invokeContext.exitHandler = (code: number, signal: string) => {
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
