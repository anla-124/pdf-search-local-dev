/**
 * Lightweight client-side logger that avoids lint warnings while providing
 * optional debug output during development.
 */

type LogMethod = (message: string, context?: unknown) => void

/**
 * Serialize context for logging, properly handling Error objects
 */
function serializeContext(context: unknown): unknown {
  if (!context) return context

  if (typeof context !== 'object') return context

  // Handle arrays
  if (Array.isArray(context)) {
    return context.map(serializeContext)
  }

  // Handle objects
  const serialized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(context)) {
    if (value instanceof Error) {
      // Serialize Error objects properly
      serialized[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack
      }
    } else if (value && typeof value === 'object') {
      serialized[key] = serializeContext(value)
    } else {
      serialized[key] = value
    }
  }

  return serialized
}

const createLoggerMethod =
  (consoleMethod: 'log' | 'warn' | 'error'): LogMethod =>
  (message, context) => {
    if (process.env.NODE_ENV !== 'production') {
      const serializedContext = serializeContext(context)
      // eslint-disable-next-line no-console
      console[consoleMethod](message, serializedContext)
    }
  }

export const clientLogger = {
  info: createLoggerMethod('log'),
  warn: createLoggerMethod('warn'),
  error: createLoggerMethod('error')
}

