
function makeOnceCallback(callback) {
  let isCalled = false;

  return (err, result) => {
    if (isCalled) {
      return;
    }

    isCalled = true;

    callback(err, result);
  };
}

exports.makeOnceCallback = makeOnceCallback;
