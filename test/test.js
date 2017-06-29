const test = require('tape');
const { spawnLambda } = require('..');

test('test', t => {
  t.plan(4);

  const options = {
    basedir: __dirname + '/lambda',
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
