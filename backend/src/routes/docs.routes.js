import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { listDocsForShipment, uploadDocToShipment, verifyDoc, generateDocForShipment, listAllDocs, deleteDoc } from '../controllers/docsController.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})

const upload = multer({ storage })

export const docsRouter = Router()

docsRouter.use(requireAuth)

docsRouter.get('/', asyncHandler(listAllDocs))

docsRouter.get('/shipments/:shipmentId', asyncHandler(listDocsForShipment))
docsRouter.post('/shipments/:shipmentId', upload.single('file'), asyncHandler(uploadDocToShipment))
docsRouter.post('/shipments/:shipmentId/generate', requireRole('MANAGER'), asyncHandler(generateDocForShipment))
docsRouter.patch('/:id/verify', requireRole('MANAGER'), asyncHandler(verifyDoc))
docsRouter.delete('/:id', requireRole('MANAGER'), asyncHandler(deleteDoc))
