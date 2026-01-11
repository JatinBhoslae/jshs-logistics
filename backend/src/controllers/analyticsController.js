import { getOverviewKPIs } from '../services/analyticsService.js'
import { getPredictiveInsights } from '../services/predictiveAnalyticsService.js'

export async function overview(req, res) {
  const kpis = await getOverviewKPIs()
  res.json({ kpis })
}

export async function predictiveInsights(req, res) {
  const insights = await getPredictiveInsights()
  res.json({ insights })
}
