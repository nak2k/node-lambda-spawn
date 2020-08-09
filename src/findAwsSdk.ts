import { delimiter, dirname, isAbsolute, join, resolve } from 'path';
import locatePath = require('locate-path-cb');

export function findAwsSdk(
  { basedir, NODE_PATH }: { basedir: string, NODE_PATH?: string },
  callback: (err: Error | null, path?: string) => void
) {
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
}
