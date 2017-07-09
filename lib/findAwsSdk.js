const { delimiter, dirname, isAbsolute, join, resolve } = require('path');
const locatePath = require('locate-path-cb');

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

  locatePath(paths.map(p => join(p, 'aws-sdk')), callback);
};

exports.findAwsSdk = findAwsSdk;
