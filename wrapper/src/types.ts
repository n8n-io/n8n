export interface BolekWorkflowExecution {
  workflowId: string
  inputs: Record<string, any>
}

export interface BolekExecutionResult {
  runId: string
  status: 'running' | 'completed' | 'failed'
  result?: Record<string, any>
  error?: string
  executionTime?: number
}

export interface BolekWorkflow {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface N8nExecution {
  id: string
  workflowId: string
  status: 'new' | 'running' | 'success' | 'error' | 'aborted'
  startedAt: string
  stoppedAt?: string
  executionData?: {
    resultData?: {
      runData: Record<string, any>
    }
    error?: Record<string, any>
  }
}
