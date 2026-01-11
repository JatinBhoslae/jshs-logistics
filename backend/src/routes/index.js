import { Router } from 'express'
import { authRouter } from './auth.routes.js'
import { shipmentRouter } from './shipment.routes.js'
import { fleetRouter } from './fleet.routes.js'
import { fleetPerformanceRouter } from './fleetPerformance.routes.js'
import { docsRouter } from './docs.routes.js'
import { paymentRouter } from './payment.routes.js'
import { analyticsRouter } from './analytics.routes.js'
import { notificationRouter } from './notification.routes.js'
import { weatherTrafficRouter } from './weatherTraffic.routes.js'
import { auditRouter } from './audit.routes.js'
import locationRoutes from './locationRoutes.js'
import { customerRouter } from './customer.routes.js'
import { driverEarningsRouter } from './driverEarnings.routes.js'
import { simulationRouter } from './simulation.routes.js'
import { searchRouter } from './search.routes.js'
import { reviewRouter } from './review.routes.js'
import documentRegenerateRouter from './documentRegenerate.routes.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/shipments', shipmentRouter)
apiRouter.use('/fleet', fleetRouter)
apiRouter.use('/fleet-performance', fleetPerformanceRouter)
apiRouter.use('/docs', docsRouter)
apiRouter.use('/payments', paymentRouter)
apiRouter.use('/analytics', analyticsRouter)
apiRouter.use('/notifications', notificationRouter)
apiRouter.use('/weather-traffic', weatherTrafficRouter)
apiRouter.use('/audit', auditRouter)
apiRouter.use('/locations', locationRoutes)
apiRouter.use('/customer', customerRouter)
apiRouter.use('/drivers/earnings', driverEarningsRouter)
apiRouter.use('/simulation', simulationRouter)
apiRouter.use('/search', searchRouter)
apiRouter.use('/reviews', reviewRouter)
apiRouter.use('/documents', documentRegenerateRouter)

