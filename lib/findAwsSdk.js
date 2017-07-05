const { delimiter, dirname, isAbsolute, join, resolve } = require('path');
const { access } = require('fs');

const findAwsSdk = ({ basedir, NODE_PATH }, callback) => {
  if (!isAbsolute(basedir)) {
    basedir = resolve(basedir);
  }

  let paths = [];

  for (; true; basedir = dirname(basedir)) {
    paths.push(join(basedir, 'node_modules'));
    if (basedir === '/') {
      break;
    }
  };

  if (NODE_PATH) {
    paths = paths.concat(NODE_PATH.split(delimiter));
  }

  const find = paths.map(p => join(p, 'aws-sdk')).reduceRight(
    (next, path) =>
      () => access(path, err =>
        err ? next(err) : callback(null, path)),
    callback
  );

  find();
};

exports.findAwsSdk = findAwsSdk;
