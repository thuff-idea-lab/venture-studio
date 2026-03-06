type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, agent: string, message: string, data?: unknown): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${agent}]`;

  if (data !== undefined) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info:  (agent: string, msg: string, data?: unknown) => log('info', agent, msg, data),
  warn:  (agent: string, msg: string, data?: unknown) => log('warn', agent, msg, data),
  error: (agent: string, msg: string, data?: unknown) => log('error', agent, msg, data),
  debug: (agent: string, msg: string, data?: unknown) => log('debug', agent, msg, data),
};
