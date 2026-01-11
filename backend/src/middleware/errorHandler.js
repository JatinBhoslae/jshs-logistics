import { ZodError } from 'zod'

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation Error',
        details: err.errors,
      },
    })
  }

  const status = err.statusCode ?? 500
  const message = err.message ?? 'Internal Server Error'

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err)
  }

  res.status(status).json({
    error: {
      message,
      status,
    },
  })
}
