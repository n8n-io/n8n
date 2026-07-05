import { Logger } from './logger'
import type { BolekWorkflowExecution, BolekExecutionResult, BolekWorkflow, N8nExecution } from './types'

export class N8nAdapter {
  private baseUrl: string
  private logger: Logger
  private apiKey?: string

  constructor(baseUrl: string, logger: Logger, apiKey?: string) {
    this.baseUrl = baseUrl
    this.logger = logger
    this.apiKey = apiKey
  }

  async executeWorkflow(request: BolekWorkflowExecution): Promise<BolekExecutionResult> {
    try {
      const startTime = Date.now()

      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${request.workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        },
        body: JSON.stringify({
          data: request.inputs
        })
      })

      if (!response.ok) {
        this.logger.error('n8n API error', { status: response.status })
        return {
          runId: '',
          status: 'failed',
          error: `n8n returned ${response.status}`
        }
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      return {
        runId: data.execution?.id || data.id || `run_${Date.now()}`,
        status: this.mapN8nStatus(data.execution?.status || 'running'),
        result: data.data,
        executionTime
      }
    } catch (err) {
      this.logger.error('Adapter error in executeWorkflow', { error: String(err) })
      return {
        runId: '',
        status: 'failed',
        error: String(err)
      }
    }
  }

  async getExecutionStatus(workflowId: string, runId: string): Promise<BolekExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/executions/${runId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        this.logger.error('n8n execution status error', { status: response.status })
        return {
          runId,
          status: 'failed',
          error: `Failed to get status: ${response.status}`
        }
      }

      const data: N8nExecution = await response.json()

      return {
        runId: data.id,
        status: this.mapN8nStatus(data.status),
        result: data.executionData?.resultData?.runData,
        error: data.executionData?.error?.message,
        executionTime: data.stoppedAt ? new Date(data.stoppedAt).getTime() - new Date(data.startedAt).getTime() : undefined
      }
    } catch (err) {
      this.logger.error('Adapter error in getExecutionStatus', { runId, error: String(err) })
      return {
        runId,
        status: 'failed',
        error: String(err)
      }
    }
  }

  async listWorkflows(): Promise<BolekWorkflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        throw new Error(`n8n returned ${response.status}`)
      }

      const data = await response.json()

      return (data.data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        createdAt: w.createdAt
      }))
    } catch (err) {
      this.logger.error('Adapter error in listWorkflows', { error: String(err) })
      return []
    }
  }

  async cancelExecution(workflowId: string, runId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/executions/${runId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        this.logger.warn('Failed to cancel execution', { status: response.status })
        return false
      }

      this.logger.info('Execution cancelled', { workflowId, runId })
      return true
    } catch (err) {
      this.logger.error('Adapter error in cancelExecution', { error: String(err) })
      return false
    }
  }

  private mapN8nStatus(n8nStatus: string): 'running' | 'completed' | 'failed' {
    switch (n8nStatus) {
      case 'success':
        return 'completed'
      case 'error':
      case 'aborted':
        return 'failed'
      case 'running':
      case 'new':
      default:
        return 'running'
    }
  }
}
