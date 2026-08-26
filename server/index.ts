import express from 'express'
import cors from 'cors'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const app = express()
const PORT = 4000
const DATA_FILE = path.resolve(process.cwd(), 'server/data/db.json')

app.use(cors())
app.use(express.json())

async function readDb() {
  return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'))
}

async function writeDb(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2))
}

function nowLabel() {
  return new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const taskTypes = [
  { type: 'DB_REFRESH', label: 'DB Refresh', description: 'Refresh a configured test database', category: 'Database' },
  { type: 'AUTOSYS', label: 'Autosys Task', description: 'Run a configured Autosys job', category: 'Scheduling' },
  { type: 'MANUAL', label: 'Manual Task', description: 'Create a human action/checkpoint', category: 'Human Action' },
  { type: 'API', label: 'API Task', description: 'Invoke a configured API endpoint', category: 'Integration' },
  { type: 'SQL', label: 'SQL Task', description: 'Execute a configured SQL statement', category: 'Database' },
  { type: 'FILE', label: 'File Task', description: 'Move, copy or validate a configured file', category: 'File Operations' },
  { type: 'VALIDATION', label: 'Validation Task', description: 'Run a configured validation rule', category: 'Quality' }
]

app.get('/api/task-types', (_req, res) => res.json(taskTypes))

app.get('/api/dashboard', async (_req, res) => {
  const db = await readDb()
  const total = db.executions.length + 122
  const successful = db.executions.filter((x: any) => x.status === 'SUCCESS').length + 92
  const failed = db.executions.filter((x: any) => x.status === 'FAILED').length + 7
  const running = db.executions.filter((x: any) => x.status === 'RUNNING').length + 7
  res.json({ metrics: { total, successful, failed, running }, workflows: db.workflows, executions: db.executions })
})

app.get('/api/tasks', async (req, res) => {
  const db = await readDb()
  const type = String(req.query.type || '')
  res.json(type ? db.tasks.filter((x: any) => x.type === type) : db.tasks)
})

app.post('/api/tasks', async (req, res) => {
  const db = await readDb()
  const task = {
    id: req.body.id || `task-${randomUUID()}`,
    type: req.body.type || 'MANUAL',
    name: req.body.name || 'New Task',
    description: req.body.description || '',
    category: req.body.category || 'Custom',
    color: req.body.color || 'purple',
    enabled: req.body.enabled ?? true,
    config: req.body.config || {},
    createdAt: req.body.createdAt || nowLabel()
  }
  db.tasks.push(task)
  db.auditLogs.unshift({ id: randomUUID(), action: 'Task created', target: task.name, at: nowLabel() })
  await writeDb(db)
  res.status(201).json(task)
})

app.put('/api/tasks/:id', async (req, res) => {
  const db = await readDb()
  const index = db.tasks.findIndex((x: any) => x.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'Task not found' })
  db.tasks[index] = { ...db.tasks[index], ...req.body, id: db.tasks[index].id }
  db.auditLogs.unshift({ id: randomUUID(), action: 'Task updated', target: db.tasks[index].name, at: nowLabel() })
  await writeDb(db)
  res.json(db.tasks[index])
})

app.delete('/api/tasks/:id', async (req, res) => {
  const db = await readDb()
  const referenced = db.workflows.some((w: any) => (w.nodes || []).some((n: any) => n.data?.taskId === req.params.id))
  if (referenced) return res.status(409).json({ error: 'Task is used by one or more workflows. Remove it from those workflows before deleting it.' })
  const before = db.tasks.length
  db.tasks = db.tasks.filter((x: any) => x.id !== req.params.id)
  if (before === db.tasks.length) return res.status(404).json({ error: 'Task not found' })
  db.auditLogs.unshift({ id: randomUUID(), action: 'Task deleted', target: req.params.id, at: nowLabel() })
  await writeDb(db)
  res.json({ success: true })
})

app.get('/api/workflows', async (_req, res) => res.json((await readDb()).workflows))

app.get('/api/workflows/:id', async (req, res) => {
  const db = await readDb()
  const workflow = db.workflows.find((x: any) => x.id === req.params.id)
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' })
  res.json(workflow)
})

app.post('/api/workflows', async (req, res) => {
  const db = await readDb()
  const existingIndex = req.body.id ? db.workflows.findIndex((x: any) => x.id === req.body.id) : -1
  const workflow = {
    id: req.body.id || `wf-${randomUUID()}`,
    name: req.body.name || 'New Workflow',
    description: req.body.description || '',
    nodes: req.body.nodes || [],
    edges: req.body.edges || [],
    status: req.body.status || 'SUCCESS',
    taskCount: req.body.nodes?.length ?? req.body.taskCount ?? 0,
    modifiedAt: req.body.modifiedAt || nowLabel(),
    lastRun: req.body.lastRun || 'Never'
  }
  if (existingIndex >= 0) {
    db.workflows[existingIndex] = workflow
    db.auditLogs.unshift({ id: randomUUID(), action: 'Workflow updated', target: workflow.name, at: nowLabel() })
  } else {
    db.workflows.unshift(workflow)
    db.auditLogs.unshift({ id: randomUUID(), action: 'Workflow created', target: workflow.name, at: nowLabel() })
  }
  await writeDb(db)
  res.status(existingIndex >= 0 ? 200 : 201).json(workflow)
})

app.delete('/api/workflows/:id', async (req, res) => {
  const db = await readDb()
  const before = db.workflows.length
  db.workflows = db.workflows.filter((x: any) => x.id !== req.params.id)
  if (before === db.workflows.length) return res.status(404).json({ error: 'Workflow not found' })
  db.auditLogs.unshift({ id: randomUUID(), action: 'Workflow deleted', target: req.params.id, at: nowLabel() })
  await writeDb(db)
  res.json({ success: true })
})

app.get('/api/executions', async (_req, res) => res.json((await readDb()).executions))
app.get('/api/audit-logs', async (_req, res) => res.json((await readDb()).auditLogs))
app.get('/api/notifications', async (_req, res) => res.json((await readDb()).notifications))

app.listen(PORT, () => console.log(`Unified Test Hub mock API running on http://localhost:${PORT}`))
