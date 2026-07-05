import { Hono } from 'hono'
import { N8nAdapter } from './adapter'
import { Logger } from './logger'
import type { BolekWorkflowExecution } from './types'

const app = new Hono()
const logger = new Logger('info')

const N8N_URL = process.env.N8N_URL || 'http://n8n:5678'
const WRAPPER_PORT = parseInt(process.env.WRAPPER_PORT || '3001')
const AUTH_TOKEN = process.env.BOLEK_API_TOKEN || 'test_token'
const N8N_API_KEY = process.env.N8N_API_KEY

const adapter = new N8nAdapter(N8N_URL, logger, N8N_API_KEY)

app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

app.post('/api/agent/workflows/execute', async (c) => {
  try {
    const body = await c.req.json<BolekWorkflowExecution>()
    logger.info('Executing workflow', { workflowId: body.workflowId })

    const result = await adapter.executeWorkflow(body)
    return c.json(result)
  } catch (err) {
    logger.error('POST /api/agent/workflows/execute failed', { error: String(err) })
    return c.json({ error: 'Failed to execute workflow' }, 500)
  }
})

app.get('/api/agent/workflows/:id/status/:runId', async (c) => {
  try {
    const workflowId = c.req.param('id')
    const runId = c.req.param('runId')

    const result = await adapter.getExecutionStatus(workflowId, runId)
    return c.json(result)
  } catch (err) {
    logger.error('GET status failed', { error: String(err) })
    return c.json({ error: 'Failed to get status' }, 500)
  }
})

app.get('/api/agent/workflows/list', async (c) => {
  try {
    const workflows = await adapter.listWorkflows()
    return c.json({ workflows })
  } catch (err) {
    logger.error('GET list workflows failed', { error: String(err) })
    return c.json({ error: 'Failed to list workflows' }, 500)
  }
})

app.post('/api/agent/workflows/:id/cancel/:runId', async (c) => {
  try {
    const workflowId = c.req.param('id')
    const runId = c.req.param('runId')

    const success = await adapter.cancelExecution(workflowId, runId)
    return c.json({ success })
  } catch (err) {
    logger.error('POST cancel failed', { error: String(err) })
    return c.json({ error: 'Failed to cancel execution' }, 500)
  }
})

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bolek-flow-wrapper' })
})

logger.info('BolekFlow wrapper starting', { port: WRAPPER_PORT, n8nUrl: N8N_URL })

export default {
  fetch: app.fetch,
  port: WRAPPER_PORT
}
