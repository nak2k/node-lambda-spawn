const test = require('tape');
const { spawnLambda } = require('..');

test('test', t => {
  t.plan(8);

  const options = {
    dir: __dirname + '/lambda',
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  const lambdaProcess = spawnLambda(options, event, context, (err, result) => {
    t.error(err);

    t.equal(typeof(result), 'object');

    const { event } = result;
    t.equal(typeof(event), 'object');

    t.equal(event.test, 'test');
  });

  t.equal(typeof(lambdaProcess), 'object');
  t.equal(lambdaProcess.stdin, null);
  t.equal(lambdaProcess.stdout, null);
  t.equal(lambdaProcess.stderr, null);
});

test('test options.stdio', t => {
  t.plan(5);

  const options = {
    dir: __dirname + '/lambda',
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  const lambdaProcess = spawnLambda(options, event, context, (err, result) => {
    t.error(err);
  });

  t.equal(typeof(lambdaProcess), 'object');
  t.equal(lambdaProcess.stdin, null);
  t.notEqual(lambdaProcess.stdout, null);
  t.notEqual(lambdaProcess.stderr, null);
});

test('test options.moduleDir', t => {
  t.plan(2);

  const options = {
    dir: __dirname,
    moduleDir: __dirname + '/lambda',
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  spawnLambda(options, event, context, (err, result) => {
    t.error(err);

    t.equal(typeof(result), 'object');
  });
});

test('test options.babel', t => {
  t.plan(2);

  const options = {
    dir: __dirname + '/babel-lambda',
    babel: true,
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  spawnLambda(options, event, context, (err, result) => {
    t.error(err);

    t.equal(typeof(result), 'object');
  });
});

test('test options.lambdaEnv', t => {
  t.plan(2);

  const options = {
    dir: __dirname + '/lambda',
    lambdaEnv: {
      foo: 'bar',
    },
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  spawnLambda(options, event, context, (err, result) => {
    t.error(err);

    t.equal(result.env.foo, 'bar');
  });
});

test('test options.additionalNodePath', t => {
  t.plan(1);

  const options = {
    dir: __dirname + '/lambda2',
    additionalNodePath: __dirname + '/additional_node_modules',
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  spawnLambda(options, event, context, (err, result) => {
    t.error(err);
  });
});
