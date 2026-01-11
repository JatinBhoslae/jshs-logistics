import { Router } from 'express'
import * as locationController from '../controllers/locationController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// All location routes require authentication
router.use(requireAuth)

router.get('/autocomplete', locationController.autocomplete)
router.get('/details', locationController.placeDetails)
router.get('/reverse', locationController.reverseGeocode)

export default router
