type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  const prefix = {
    info: '✅',
    warn: '⚠️ ',
    error: '❌',
    debug: '🔍',
  }[level];

  const formatted = `[${entry.timestamp}] ${prefix} ${message}`;

  if (context && Object.keys(context).length > 0) {
    if (level === 'error') {
      console.error(formatted, context);
    } else {
      console.log(formatted, context);
    }
  } else {
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => log('error', message, context),
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
};
