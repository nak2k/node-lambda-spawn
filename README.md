# lambda-spawn

Run lambda function as child process.

## Installation

```
npm i lambda-spawn
```

## Usage

``` javascript
const {
  INVOKE_RESULT,
  spawnLambda,
} = require('lambda-spawn');

const options = {
  handler: 'index.handler',
  moduleDir: 'path/to/lambda',
};

const lambdaProcess = spawnLambda(options, event, context);

lambdaProcess.on(INVOKE_RESULT, ({ result }) => {
});
```

## API

### spawnLambda(options, event, context)

- `options.arn`
  - An ARN that identify a lambda process.
- `options.dir`
  - A current directory of the lambda process.
  - Default: `process.cwd()`
- `options.handler`
  - Names of a module and a function.
  - Default: `index.handler`
- `options.env`
  - An object of environment variables that is used to launch a lambda process.
  - Default: `process.env`
- `options.lambdaEnv`
  - An object of environment variables that is used as the lambda configuration.
  - This object is merged to `options.env`.
- `options.moduleDir`
  - A path of a directory that the lambda function is located.
- `options.typescript`
  - If this option is truthy, `ts-node` is used to launch a lambda process.
- `event`
  - An event object that is used to invoke the lambda function.
- `context`
  - A context object that is used to invoke the lambda function.

### LambdaProcess

#### Properties

- `arn`
  - An ARN that is passed to `spawnLambda`.

#### Event: `lambda.INVOKE_RESULT`

The `lambda.INVOKE_RESULT` event is emitted when the lambda function returns the result.

This event passes a message object to a listener. The message object has following properties:

- `err`
  - An Error object when the lambda function returns an error.
- `result`
  - A result that is returned by the lambda function.

## License

MIT
