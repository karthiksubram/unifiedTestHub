import type { Dashboard, Execution, TaskPlugin, TaskTypeDefinition, Workflow } from './types'

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!response.ok) {
    throw new Error((await response.text()) || `Request failed: ${response.status}`)
  }
  return response.json()
}

export const api = {
  dashboard: () => request<Dashboard>('/api/dashboard'),
  taskTypes: () => request<TaskTypeDefinition[]>('/api/task-types'),
  tasks: (type?: string) => request<TaskPlugin[]>(type ? `/api/tasks?type=${encodeURIComponent(type)}` : '/api/tasks'),
  createTask: (task: Partial<TaskPlugin>) => request<TaskPlugin>('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, task: Partial<TaskPlugin>) => request<TaskPlugin>(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
  deleteTask: (id: string) => request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
  workflows: () => request<Workflow[]>('/api/workflows'),
  workflow: (id: string) => request<Workflow>(`/api/workflows/${id}`),
  createWorkflow: (workflow: Partial<Workflow>) => request<Workflow>('/api/workflows', { method: 'POST', body: JSON.stringify(workflow) }),
  deleteWorkflow: (id: string) => request<{ success: boolean }>(`/api/workflows/${id}`, { method: 'DELETE' }),
  executions: () => request<Execution[]>('/api/executions'),
  auditLogs: () => request<any[]>('/api/audit-logs'),
  notifications: () => request<any[]>('/api/notifications')
}
