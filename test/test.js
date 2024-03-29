const test = require('tape');
const {
  spawnLambda,
  INIT_RESULT,
} = require('..');

test('test', t => {
  t.plan(10);

  const options = {
    arn: t.name,
    dir: __dirname + '/lambda',
  };

  const lambdaProcess = spawnLambda(options);

  t.equal(typeof lambdaProcess, 'object');
  t.equal(lambdaProcess.stdin, null);
  t.equal(lambdaProcess.stdout, null);
  t.equal(lambdaProcess.stderr, null);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      t.equal(typeof result, 'object');

      const { env, event } = result;

      t.deepEqual(event, { test: 'test' });

      t.equal(env.LAMBDA_TASK_ROOT, __dirname + '/lambda');
      t.equal(env.LAMBDA_RUNTIME_DIR, __dirname + '/lambda');

      lambdaProcess.kill();
    });
  });
});

test('test options.stdio', t => {
  t.plan(7);

  const options = {
    arn: t.name,
    dir: __dirname + '/lambda',
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  const lambdaProcess = spawnLambda(options);

  t.equal(typeof lambdaProcess, 'object');
  t.equal(lambdaProcess.stdin, null);
  t.notEqual(lambdaProcess.stdout, null);
  t.notEqual(lambdaProcess.stderr, null);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      t.equal(typeof (result), 'object');

      lambdaProcess.kill();
    });
  });
});

test('test options.moduleDir', t => {
  t.plan(3);

  const options = {
    arn: t.name,
    dir: __dirname,
    moduleDir: __dirname + '/lambda',
  };

  const lambdaProcess = spawnLambda(options);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      t.equal(typeof result, 'object');

      lambdaProcess.kill();
    });
  });
});

test('test options.lambdaEnv', t => {
  t.plan(3);

  const options = {
    arn: t.name,
    dir: __dirname + '/lambda',
    lambdaEnv: {
      foo: 'bar',
    },
  };

  const lambdaProcess = spawnLambda(options);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      t.equal(result.env.foo, 'bar');

      lambdaProcess.kill();
    });
  });
});

test('test options.additionalNodePath', t => {
  t.plan(2);

  const options = {
    arn: t.name,
    dir: __dirname + '/lambda2',
    additionalNodePath: __dirname + '/additional_node_modules',
  };

  const lambdaProcess = spawnLambda(options);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      lambdaProcess.kill();
    });
  });
});

test('test typescript-lambda', t => {
  t.plan(3);

  const options = {
    arn: t.name,
    dir: __dirname + '/typescript-lambda',
    typescript: true,
  };

  const lambdaProcess = spawnLambda(options);

  lambdaProcess.on(INIT_RESULT, ({ err }) => {
    t.error(err);

    const event = {
      test: 'test',
    };

    const context = {
    };

    lambdaProcess.invoke(event, context, (err, result) => {
      t.error(err);

      t.equal(typeof (result), 'object');

      lambdaProcess.kill();
    });
  });
});
