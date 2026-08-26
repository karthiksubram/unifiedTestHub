export type TaskType =
  | 'DB_REFRESH'
  | 'AUTOSYS'
  | 'MANUAL'
  | 'API'
  | 'SQL'
  | 'FILE'
  | 'VALIDATION'

export type Status = 'SUCCESS' | 'FAILED' | 'RUNNING' | 'PENDING'

export interface TaskPlugin {
  id: string
  type: TaskType
  name: string
  description: string
  category: string
  color: string
  enabled: boolean
  config: Record<string, string>
  createdAt?: string
}

export interface TaskTypeDefinition {
  type: TaskType
  label: string
  description: string
  category: string
}

export interface WorkflowNode {
  id: string
  type: 'task'
  position: { x: number; y: number }
  data: { label: string; taskType: TaskType; taskId: string; configSummary?: string }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  animated?: boolean
  markerEnd?: unknown
}

export interface Workflow {
  id: string
  name: string
  description: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: Status
  taskCount: number
  modifiedAt: string
  lastRun: string
}

export interface Execution {
  id: string
  name: string
  type: string
  workflow: string
  status: Status
  startedAt: string
  duration: string
}

export interface Dashboard {
  metrics: {
    total: number
    successful: number
    failed: number
    running: number
  }
  workflows: Workflow[]
  executions: Execution[]
}
