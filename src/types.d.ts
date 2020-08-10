declare module 'locate-path-cb';

declare namespace NodeJS {
  interface Process {
    lambdaHandler(event: any, context: any, callback: (err: Error | null, result?: any) => void): void;
  }
}
