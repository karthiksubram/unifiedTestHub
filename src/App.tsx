import { useEffect, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  Clock3,
  Database,
  FileText,
  Hand,
  Home,
  LayoutGrid,
  Menu,
  MoreVertical,
  Network,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Terminal,
  Trash2,
  Workflow as WorkflowIcon,
  XCircle,
  Code2,
  FolderOpen
} from 'lucide-react'
import { api } from './api'
import type { Dashboard, Execution, TaskPlugin, TaskType, TaskTypeDefinition, Workflow } from './types'
import WorkflowBuilder from './components/WorkflowBuilder'

type Page = 'home' | 'tasks' | 'workflows' | 'executions' | 'audit' | 'notifications'

const taskIcon = (type: TaskType) => {
  const map: Record<TaskType, any> = {
    DB_REFRESH: Database,
    AUTOSYS: Clock3,
    MANUAL: Hand,
    API: Code2,
    SQL: Terminal,
    FILE: FileText,
    VALIDATION: ShieldCheck
  }
  return map[type] ?? Settings2
}

const taskColor = (type: TaskType) => ({
  DB_REFRESH: 'purple',
  AUTOSYS: 'green',
  MANUAL: 'blue',
  API: 'orange',
  SQL: 'slate',
  FILE: 'pink',
  VALIDATION: 'cyan'
}[type] ?? 'purple')

function App() {
  const [page, setPage] = useState<Page>('home')
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [tasks, setTasks] = useState<TaskPlugin[]>([])
  const [taskTypes, setTaskTypes] = useState<TaskTypeDefinition[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [builderWorkflow, setBuilderWorkflow] = useState<Workflow | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toast, setToast] = useState('')

  const refresh = async () => {
    const [d, t, tt, w, e] = await Promise.all([
      api.dashboard(),
      api.tasks(),
      api.taskTypes(),
      api.workflows(),
      api.executions()
    ])
    setDashboard(d)
    setTasks(t)
    setTaskTypes(tt)
    setWorkflows(w)
    setExecutions(e)
  }

  useEffect(() => {
    refresh().catch(err => setToast(err.message))
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(timer)
  }, [toast])

  const openBuilder = (workflow?: Workflow) => {
    setBuilderWorkflow(workflow ?? null)
    setBuilderOpen(true)
    setPage('workflows')
  }

  const closeBuilder = () => {
    setBuilderOpen(false)
    setBuilderWorkflow(null)
    setPage('workflows')
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow?')) return
    await api.deleteWorkflow(id)
    await refresh()
    setToast('Workflow deleted')
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this saved task?')) return
    try {
      await api.deleteTask(id)
      await refresh()
      setToast('Task deleted')
    } catch (e: any) {
      setToast(e?.message || 'Unable to delete task')
    }
  }

  const pageTitle = {
    home: 'Welcome back, Karthik 👋',
    tasks: 'Tasks',
    workflows: 'Workflows',
    executions: 'Executions',
    audit: 'Audit Logs',
    notifications: 'Notifications'
  }[page]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="brand">
          <div className="brand-mark">⬡</div>
          {sidebarOpen && <span>Unified Test Hub</span>}
        </div>

        <nav>
          <NavItem icon={<Home />} label="Home" active={page === 'home'} onClick={() => { closeBuilder(); setPage('home') }} open={sidebarOpen} />
          {sidebarOpen && <div className="nav-section-title">TASKS</div>}
          {sidebarOpen && taskTypes.map(def => {
            const Icon = taskIcon(def.type)
            const count = tasks.filter(t => t.type === def.type).length
            return (
              <NavItem
                key={def.type}
                icon={<Icon />}
                label={`${def.label}${count ? ` (${count})` : ''}`}
                active={page === 'tasks' && search === def.type}
                onClick={() => { closeBuilder(); setSearch(def.type); setPage('tasks') }}
                open={sidebarOpen}
              />
            )
          })}

          {sidebarOpen && <div className="nav-section-title divider">WORKFLOWS</div>}
          <NavItem icon={<Network />} label="All Workflows" active={page === 'workflows' && !builderOpen} onClick={() => { closeBuilder(); setPage('workflows') }} open={sidebarOpen} />

          {sidebarOpen && <div className="nav-section-title divider">EXECUTIONS</div>}
          <NavItem icon={<CirclePlay />} label="All Executions" active={page === 'executions'} onClick={() => { closeBuilder(); setPage('executions') }} open={sidebarOpen} />

          {sidebarOpen && <div className="nav-section-title divider">ADMINISTRATION</div>}
          <NavItem icon={<FileText />} label="Audit Logs" active={page === 'audit'} onClick={() => { closeBuilder(); setPage('audit') }} open={sidebarOpen} />
          <NavItem icon={<Bell />} label="Notifications" active={page === 'notifications'} onClick={() => { closeBuilder(); setPage('notifications') }} open={sidebarOpen} />
        </nav>

        <button className="collapse-btn" onClick={() => setSidebarOpen(v => !v)}>
          <ArrowLeft className={sidebarOpen ? '' : 'flip'} /> {sidebarOpen && 'Collapse'}
        </button>

        {sidebarOpen && (
          <div className="user-card">
            <div className="avatar">KS</div>
            <div>
              <strong>Karthik S</strong>
              <small>Administrator</small>
            </div>
            <ChevronDown size={15} />
          </div>
        )}
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-menu" onClick={() => setSidebarOpen(v => !v)}><Menu /></div>
          <div>
            <h1>{pageTitle}</h1>
            <p>{page === 'home' ? 'Orchestrate, automate and monitor your test data operations' : 'Manage and monitor your test automation platform'}</p>
          </div>
          <div className="top-actions">
            <div className="search-box">
              <Search size={18} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search anything..." />
              <kbd>⌘K</kbd>
            </div>
            <Bell size={22} />
            <div className="top-avatar">KS</div>
          </div>
        </header>

        <div className="content">
          {page === 'home' && dashboard && (
            <DashboardPage dashboard={dashboard} tasks={tasks} onNewTask={() => setPage('tasks')} onNewWorkflow={() => openBuilder()} onOpenWorkflow={openBuilder} />
          )}

          {page === 'tasks' && (
            <TasksPage tasks={tasks} taskTypes={taskTypes} selectedType={search} onDelete={deleteTask} onCreated={async () => { await refresh(); setToast('Task created') }} onUpdated={async () => { await refresh(); setToast('Task updated') }} />
          )}

          {page === 'workflows' && !builderOpen && (
            <WorkflowsPage workflows={workflows.filter(w => `${w.name} ${w.description}`.toLowerCase().includes(search.toLowerCase()))} onNew={() => openBuilder()} onEdit={openBuilder} onDelete={deleteWorkflow} />
          )}

          {page === 'workflows' && builderOpen && (
            <WorkflowBuilder
              workflow={builderWorkflow}
              tasks={tasks}
              onBack={() => { closeBuilder(); refresh() }}
              onSaved={async () => { await refresh(); closeBuilder(); setToast('Workflow saved') }}
            />
          )}

          {page === 'executions' && <ExecutionsPage executions={executions.filter(e => `${e.name} ${e.workflow}`.toLowerCase().includes(search.toLowerCase()))} />}
          {page === 'audit' && <GenericPage title="Audit Logs" subtitle="Track changes made across Unified Test Hub." rows={['Workflow created', 'Task plugin added', 'Workflow executed', 'Workflow deleted']} />}
          {page === 'notifications' && <GenericPage title="Notifications" subtitle="Recent platform events and execution alerts." rows={['Daily Test Setup completed successfully', 'Trade Validation failed', 'DB Refresh is running', 'New task plugin registered']} />}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function NavItem({ icon, label, active, onClick, open }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; open: boolean }) {
  return <button className={`nav-item ${active ? 'active' : ''} ${!open ? 'icon-only' : ''}`} onClick={onClick} title={label}>{icon}{open && <span>{label}</span>}</button>
}

function DashboardPage({ dashboard, tasks, onNewTask, onNewWorkflow, onOpenWorkflow }: { dashboard: Dashboard; tasks: TaskPlugin[]; onNewTask: () => void; onNewWorkflow: () => void; onOpenWorkflow: (w: Workflow) => void }) {
  return (
    <>
      <section className="metrics">
        <Metric icon={<Activity />} label="Total Executions" value={dashboard.metrics.total} note="12% vs last 7 days" tone="purple" />
        <Metric icon={<CheckCircle2 />} label="Successful" value={dashboard.metrics.successful} note="18% vs last 7 days" tone="green" />
        <Metric icon={<XCircle />} label="Failed" value={dashboard.metrics.failed} note="8% vs last 7 days" tone="orange" down />
        <Metric icon={<Play />} label="Running" value={dashboard.metrics.running} note="same as last 7 days" tone="blue" />
      </section>

      <section className="dashboard-grid">
        <div className="left-column">
          <Panel title="Quick Actions">
            <div className="quick-actions">
              {tasks.slice(0, 4).map(task => {
                const Icon = taskIcon(task.type)
                return <button className="quick-card" key={task.id} onClick={onNewTask}><div className={`task-icon ${taskColor(task.type)}`}><Icon /></div><strong>{task.name}</strong><small>{task.description}</small></button>
              })}
              <button className="quick-card" onClick={onNewWorkflow}><div className="task-icon purple"><WorkflowIcon /></div><strong>New Workflow</strong><small>Build a workflow</small></button>
            </div>
          </Panel>

          <Panel title="Recent Executions" action="View all">
            <ExecutionTable executions={dashboard.executions.slice(0, 5)} />
          </Panel>
        </div>

        <div className="right-column">
          <Panel title="Workflows" action="+ New Workflow" onAction={onNewWorkflow}>
            <div className="workflow-list">
              {dashboard.workflows.slice(0, 5).map(w => (
                <button className="workflow-row" key={w.id} onClick={() => onOpenWorkflow(w)}>
                  <div className="workflow-symbol"><Network /></div>
                  <div className="workflow-main"><strong>{w.name}</strong><small>{w.taskCount} Tasks · Modified {w.modifiedAt}</small></div>
                  <div className="workflow-last">Last run: {w.lastRun}</div>
                  <StatusBadge status={w.status} />
                  <MoreVertical size={17} />
                </button>
              ))}
            </div>
            <div className="panel-link">View all workflows <ChevronRight size={16} /></div>
          </Panel>

          <Panel title="Getting Started">
            <div className="getting-started">
              {[
                ['1', <Database />, 'Choose a Task', 'Select from available task plugins'],
                ['2', <Network />, 'Build Workflow', 'Drag and drop tasks and define flow'],
                ['3', <Play />, 'Run', 'Execute workflow manually or via API'],
                ['4', <Activity />, 'Monitor', 'Track execution and analyze results']
              ].map(([n, icon, title, text]) => <div className="step" key={String(n)}><div className="step-icon">{icon}</div><b>{n}</b><strong>{title}</strong><small>{text}</small></div>)}
            </div>
          </Panel>
        </div>
      </section>
    </>
  )
}

function Metric({ icon, label, value, note, tone, down }: any) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div><span>{label}</span><strong>{value}</strong><small className={down ? 'negative' : 'positive'}>{down ? '↓ ' : '↑ '}{note}</small></div></div>
}

function Panel({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-header"><h2>{title}</h2>{action && <button onClick={onAction}>{action}</button>}</div>{children}</section>
}

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase()
  return <span className={`status ${status.toLowerCase()}`}>{label}</span>
}

function ExecutionTable({ executions }: { executions: Execution[] }) {
  return <div className="execution-table"><div className="table-head"><span>Name</span><span>Type</span><span>Workflow</span><span>Status</span><span>Started At</span><span>Duration</span></div>{executions.map(e => <div className="table-row" key={e.id}><strong>{e.name}</strong><span>{e.type}</span><span>{e.workflow}</span><StatusBadge status={e.status} /><span>{e.startedAt}</span><span>{e.duration}</span><MoreVertical size={16} /></div>)}</div>
}

function TasksPage({ tasks, taskTypes, selectedType, onDelete, onCreated, onUpdated }: { tasks: TaskPlugin[]; taskTypes: TaskTypeDefinition[]; selectedType: string; onDelete: (id: string) => void; onCreated: () => void; onUpdated: () => void }) {
  const selectedDefinition = taskTypes.find(t => t.type === selectedType)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TaskPlugin | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>((selectedDefinition?.type as TaskType) || 'DB_REFRESH')
  const [config, setConfig] = useState<Record<string, string>>({})

  const effectiveType = (selectedDefinition?.type as TaskType) || type
  const currentType = taskTypes.find(t => t.type === effectiveType)
  const typeTasks = tasks.filter(t => t.type === effectiveType)

  useEffect(() => {
    if (selectedDefinition) setType(selectedDefinition.type as TaskType)
  }, [selectedDefinition?.type])

  const fields: Record<TaskType, { key: string; label: string; placeholder: string }[]> = {
    DB_REFRESH: [
      { key: 'database', label: 'Database', placeholder: 'e.g. dev1' },
      { key: 'schema', label: 'Schema', placeholder: 'e.g. CUSTOMER' },
      { key: 'refreshMode', label: 'Refresh mode', placeholder: 'Full / Selective' }
    ],
    AUTOSYS: [{ key: 'jobName', label: 'Autosys job', placeholder: 'e.g. CUSTOMER_EOD' }],
    MANUAL: [{ key: 'instruction', label: 'Instruction', placeholder: 'What should the tester do?' }],
    API: [
      { key: 'method', label: 'HTTP method', placeholder: 'GET / POST' },
      { key: 'endpoint', label: 'Endpoint', placeholder: '/api/test-data/reset' }
    ],
    SQL: [{ key: 'query', label: 'SQL', placeholder: 'select count(*) from ...' }],
    FILE: [
      { key: 'sourcePath', label: 'Source path', placeholder: '/test/input/file.csv' },
      { key: 'targetPath', label: 'Target path', placeholder: '/test/output/file.csv' }
    ],
    VALIDATION: [
      { key: 'rule', label: 'Validation rule', placeholder: 'e.g. CUSTOMER_COUNT > 0' }
    ]
  }

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setConfig({})
    setType(effectiveType)
    setShowForm(true)
  }

  const openEdit = (task: TaskPlugin) => {
    setEditing(task)
    setName(task.name)
    setDescription(task.description)
    setType(task.type)
    setConfig(task.config || {})
    setShowForm(true)
  }

  const save = async () => {
    if (!name.trim()) return
    const def = taskTypes.find(t => t.type === type)
    const payload = { name: name.trim(), description: description.trim(), type, category: def?.category || 'Custom', color: taskColor(type), enabled: true, config }
    if (editing) await api.updateTask(editing.id, payload)
    else await api.createTask(payload)
    setShowForm(false)
    editing ? onUpdated() : onCreated()
  }

  return <div className="page-stack">
    <div className="page-toolbar">
      <div>
        <h2>{currentType?.label || 'Tasks'}</h2>
        <p>{currentType?.description || 'Create reusable task instances. These saved tasks are the building blocks used by workflows.'}</p>
      </div>
      <button className="primary-btn" onClick={openCreate}><Plus size={17} /> Create {currentType?.label || 'Task'}</button>
    </div>

    {showForm && <div className="task-form-card">
      <div className="task-form-header"><div><strong>{editing ? 'Edit task' : 'Create task'}</strong><small>This is a saved task instance that can later be dragged into a workflow.</small></div><button className="icon-btn" onClick={() => setShowForm(false)}><X size={17}/></button></div>
      <div className="task-form-grid">
        <label>Task name<input autoFocus placeholder="e.g. My DB Refresh" value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Description<input placeholder="Describe what this saved task does" value={description} onChange={e => setDescription(e.target.value)} /></label>
        {!selectedDefinition && <label>Task type<select value={type} onChange={e => { setType(e.target.value as TaskType); setConfig({}) }}>{taskTypes.map(t => <option value={t.type} key={t.type}>{t.label}</option>)}</select></label>}
        {fields[type].map(field => <label key={field.key}>{field.label}<input placeholder={field.placeholder} value={config[field.key] || ''} onChange={e => setConfig(c => ({ ...c, [field.key]: e.target.value }))} /></label>)}
      </div>
      <div className="form-actions"><button className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-btn" onClick={save} disabled={!name.trim()}>{editing ? 'Save Changes' : 'Save Task'}</button></div>
    </div>}

    {!typeTasks.length ? <div className="empty-state-card"><div className={`task-icon ${taskColor(effectiveType)}`}><Plus /></div><h3>No {currentType?.label || 'tasks'} created yet</h3><p>Create a configured task instance first. It will then appear here and in the Workflow Builder as an available task.</p><button className="primary-btn" onClick={openCreate}><Plus size={16}/> Create task</button></div> :
      <div className="task-grid">{typeTasks.map(task => { const Icon = taskIcon(task.type); return <div className="task-card" key={task.id}><div className={`task-icon ${taskColor(task.type)}`}><Icon /></div><div className="task-card-content"><div><strong>{task.name}</strong><span className="plugin-type">{task.type}</span></div><p>{task.description || 'No description'}</p><div className="task-config-summary">{Object.entries(task.config || {}).filter(([,v]) => v).slice(0, 3).map(([k,v]) => <span key={k}><b>{k}:</b> {v}</span>)}</div><small>{task.category} · {task.enabled ? 'Enabled' : 'Disabled'}</small></div><div className="task-card-actions"><button className="icon-btn" onClick={() => openEdit(task)} title="Edit"><Settings2 size={16}/></button><button className="icon-btn danger" onClick={() => onDelete(task.id)} title="Delete"><Trash2 size={17} /></button></div></div>})}</div>}
  </div>
}

function WorkflowsPage({ workflows, onNew, onEdit, onDelete }: { workflows: Workflow[]; onNew: () => void; onEdit: (w: Workflow) => void; onDelete: (id: string) => void }) {
  return <div className="page-stack"><div className="page-toolbar"><div><h2>All Workflows</h2><p>Create reusable workflows by combining task plugins into an executable flow.</p></div><button className="primary-btn" onClick={onNew}><Plus size={17} /> New Workflow</button></div><div className="workflow-cards">{workflows.map(w => <div className="workflow-card" key={w.id}><div className="workflow-card-top"><div className="workflow-symbol large"><Network /></div><div><h3>{w.name}</h3><p>{w.description}</p></div><StatusBadge status={w.status} /></div><div className="workflow-meta"><span>{w.taskCount} tasks</span><span>Modified {w.modifiedAt}</span><span>Last run {w.lastRun}</span></div><div className="card-actions"><button onClick={() => onEdit(w)}>Edit workflow</button><button onClick={() => onEdit(w)}><Play size={15} /> Run</button><button className="danger-text" onClick={() => onDelete(w.id)}><Trash2 size={15} /> Delete</button></div></div>)}</div></div>
}

function ExecutionsPage({ executions }: { executions: Execution[] }) {
  return <div className="page-stack"><div className="page-toolbar"><div><h2>All Executions</h2><p>Monitor workflow and individual task execution history.</p></div></div><Panel title={`${executions.length} executions`}><ExecutionTable executions={executions} /></Panel></div>
}

function GenericPage({ title, subtitle, rows }: { title: string; subtitle: string; rows: string[] }) {
  return <div className="page-stack"><div className="page-toolbar"><div><h2>{title}</h2><p>{subtitle}</p></div></div><Panel title="Recent activity"><div className="generic-list">{rows.map((r, i) => <div key={i}><div className="activity-dot" /><strong>{r}</strong><small>Today · {10 + i}:2{i} AM</small></div>)}</div></Panel></div>
}

export default App
