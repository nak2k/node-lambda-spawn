import { join } from 'path';

export const INIT = 'lambda.INIT';
export const INIT_RESULT = 'lambda.INIT_RESULT';
export const INVOKE = 'lambda.INVOKE';
export const INVOKE_RESULT = 'lambda.INVOKE_RESULT';

export const DEFAULT_DRIVER_PATH = join(__dirname, 'driver.js');
