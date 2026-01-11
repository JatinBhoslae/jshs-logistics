import { Router } from 'express'
import { globalSearch } from '../controllers/searchController.js'
import { requireAuth } from '../middleware/auth.js'

export const searchRouter = Router()

searchRouter.get('/', requireAuth, globalSearch)
