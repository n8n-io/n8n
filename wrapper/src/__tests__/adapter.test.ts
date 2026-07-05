import { N8nAdapter } from '../adapter'
import { Logger } from '../logger'

describe('N8nAdapter', () => {
  let adapter: N8nAdapter
  let logger: Logger

  beforeEach(() => {
    logger = new Logger('debug')
    adapter = new N8nAdapter('http://localhost:5678', logger)
  })

  it('should execute workflow and return runId', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        execution: {
          id: 'exec_123',
          status: 'success'
        },
        data: { result: 'success' }
      })
    })

    const result = await adapter.executeWorkflow({
      workflowId: 'workflow_1',
      inputs: { param: 'value' }
    })

    expect(result.runId).toBe('exec_123')
    expect(result.status).toBe('completed')
  })

  it('should get execution status', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'exec_123',
        status: 'success',
        startedAt: new Date().toISOString(),
        executionData: {
          resultData: { runData: { result: 'done' } }
        }
      })
    })

    const result = await adapter.getExecutionStatus('workflow_1', 'exec_123')

    expect(result.runId).toBe('exec_123')
    expect(result.status).toBe('completed')
  })

  it('should list workflows', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'w1', name: 'Workflow 1' },
          { id: 'w2', name: 'Workflow 2' }
        ]
      })
    })

    const workflows = await adapter.listWorkflows()

    expect(workflows).toHaveLength(2)
    expect(workflows[0].name).toBe('Workflow 1')
  })

  it('should cancel execution', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    const success = await adapter.cancelExecution('workflow_1', 'exec_123')

    expect(success).toBe(true)
  })
})
