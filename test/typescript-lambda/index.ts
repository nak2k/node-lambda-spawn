export const handler = (event: any, context: any, callback: (err: Error | null, result?: any) => void) => {
  callback(null, {
    event,
  });
};
