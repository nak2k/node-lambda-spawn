const test = require('tape');
const { spawnLambda } = require('..');

test('test', t => {
  t.plan(4);

  const options = {
    dir: __dirname + '/lambda',
  };

  const event = {
    test: 'test',
  };

  const context = {
  };

  spawnLambda(options, event, context, (err, result) => {
    t.error(err);

    t.equal(typeof(result), 'object');

    const { event } = result;
    t.equal(typeof(event), 'object');

    t.equal(event.test, 'test');
  });
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
