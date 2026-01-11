import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { LogisticsOrg } from '../models/LogisticsOrg.js'

export const logisticsRouter = Router()

// Public: drivers need to see available logistics orgs during registration
logisticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = await LogisticsOrg.find().sort({ name: 1 }).select('_id name').lean()
    res.json({ logistics: rows })
  })
)
