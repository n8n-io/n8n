export class Logger {
  private level: 'debug' | 'info' | 'warn' | 'error'

  constructor(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
    this.level = level
  }

  info(message: string, data?: Record<string, any>) {
    console.log(JSON.stringify({ level: 'info', message, ...data, timestamp: new Date().toISOString() }))
  }

  error(message: string, data?: Record<string, any>) {
    console.error(JSON.stringify({ level: 'error', message, ...data, timestamp: new Date().toISOString() }))
  }

  warn(message: string, data?: Record<string, any>) {
    console.warn(JSON.stringify({ level: 'warn', message, ...data, timestamp: new Date().toISOString() }))
  }

  debug(message: string, data?: Record<string, any>) {
    if (this.level === 'debug') {
      console.log(JSON.stringify({ level: 'debug', message, ...data, timestamp: new Date().toISOString() }))
    }
  }
}
