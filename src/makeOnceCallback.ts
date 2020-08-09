export function makeOnceCallback<Result = any>(callback: (err: Error | null, result?: Result) => void) {
  let isCalled = false;

  return (err: Error | null, result?: Result) => {
    if (isCalled) {
      return;
    }

    isCalled = true;

    callback(err, result);
  };
}
