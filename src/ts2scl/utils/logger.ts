import { existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// ANSI color codes for console output
const Colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Red: '\x1b[31m',
  Green: '\x1b[32m',
  Yellow: '\x1b[33m',
  Blue: '\x1b[34m',
  Gray: '\x1b[90m',
};

interface LogContext {
  error?: Error;
  [key: string]: any;
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logFile: string;
  private logDir: string = 'logs';

  private constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = resolve(process.cwd(), 'logs');
    this.logFile = resolve(this.logDir, `ts2scl-${timestamp}.log`);
    this.ensureLogDirectory();
    this.initLogFile();
  }

  private initLogFile() {
    const message = this.formatMessage('INFO', 'Log session started', {
      cwd: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
    });
    // Write initial log entry to file
    // this.writeToFile(message);
  }

  private writeToFile(message: string) {
    try {
      appendFileSync(this.logFile, message);
    } catch (error: any) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }

  private ensureLogDirectory() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public setLogLevel(level: LogLevel) {
    this.logLevel = level;
    this.info(`Log level set to ${LogLevel[level]}`);
  }

  private getCallerInfo(): string {
    const error = new Error();
    const stack = error.stack?.split('\n')[4]; // Skip logger internal calls
    if (!stack) return '';

    const match = stack.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
    if (!match) return '';

    const [, , file, line] = match;
    return `${file}:${line}`;
  }

  private formatError(error: Error): string {
    return `${error.name}: ${error.message}\nStack trace:\n${error.stack}`;
  }

  private formatContext(context?: LogContext): string {
    if (!context) return '';

    let result = '';
    if (context.error) {
      result += `\nError Details:\n${this.formatError(context.error)}`;
      delete context.error;
    }

    const remainingContext =
      Object.keys(context).length > 0 ? `\nContext:\n${JSON.stringify(context, null, 2)}` : '';

    return result + remainingContext;
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const caller = this.getCallerInfo();
    let formattedMessage = `[${timestamp}] ${level.padEnd(5)}: ${message}`;

    if (caller) {
      formattedMessage += ` (${caller})`;
    }

    if (context) {
      formattedMessage += this.formatContext(context);
    }

    return formattedMessage + '\n';
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return Colors.Gray;
      case LogLevel.INFO:
        return Colors.Green;
      case LogLevel.WARN:
        return Colors.Yellow;
      case LogLevel.ERROR:
        return Colors.Red;
      default:
        return Colors.Reset;
    }
  }

  private log(level: LogLevel, levelStr: string, message: string, context?: LogContext) {
    if (level >= this.logLevel) {
      const formattedMessage = this.formatMessage(levelStr, message, context);

      // Write to console with colors
      const color = this.getColorForLevel(level);
      console.log(color + formattedMessage + Colors.Reset);

      // Write to file without colors
      // this.writeToFile(formattedMessage);
    }
  }

  public debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context);
  }

  public info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, 'INFO', message, context);
  }

  public warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, 'WARN', message, context);
  }

  public error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, 'ERROR', message, context);
  }
}
