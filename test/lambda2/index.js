require('mymodule');

exports.handler = (event, context, callback) => {
  callback(null, {
    event,
    context,
    env: process.env,
  });
};
