declare module 'locate-path-cb';

declare namespace NodeJS {
  interface Process {
    lambdaHandler(event: any, context: any, callback: (err: Error | null, result?: any) => void): void;
  }
}

declare module 'child_process' {
  interface ChildProcess {
    arn?: string;
    msgId: number;

    invoke(event: any, context: any, callback: (err: Error | null, result?: any) => void): void;
  }
}
