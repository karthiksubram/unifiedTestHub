import { useCallback, useMemo, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Code2, Database, FileText, GripVertical, Hand, Play, Save, Search, ShieldCheck, Terminal, Trash2, X, Clock3 } from 'lucide-react'
import { api } from '../api'
import type { TaskPlugin, TaskType, Workflow } from '../types'

const iconMap: Record<TaskType, any> = {
  DB_REFRESH: Database,
  AUTOSYS: Clock3,
  MANUAL: Hand,
  API: Code2,
  SQL: Terminal,
  FILE: FileText,
  VALIDATION: ShieldCheck
}

const colorMap: Record<TaskType, string> = {
  DB_REFRESH: '#7357d8',
  AUTOSYS: '#1a9d65',
  MANUAL: '#2e73d9',
  API: '#ec7d21',
  SQL: '#5c6b7a',
  FILE: '#d44c9c',
  VALIDATION: '#08a7b5'
}

const summary = (task: TaskPlugin) => Object.entries(task.config || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).slice(0, 2).join(' · ')

function TaskNode({ data, selected }: NodeProps<any>) {
  const Icon = iconMap[data.taskType as TaskType] || Database
  const color = colorMap[data.taskType as TaskType] || '#7357d8'
  return (
    <div className={`builder-node ${selected ? 'selected' : ''}`} style={{ '--node-color': color } as React.CSSProperties}>
      <Handle type="target" position={Position.Left} />
      <div className="builder-node-icon"><Icon size={17} /></div>
      <div className="builder-node-copy">
        <strong>{data.label}</strong>
        <small>{data.taskType}</small>
        {data.configSummary && <em>{data.configSummary}</em>}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

export default function WorkflowBuilder({ workflow, tasks, onBack, onSaved }: { workflow: Workflow | null; tasks: TaskPlugin[]; onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState(workflow?.name ?? '')
  const [description, setDescription] = useState(workflow?.description ?? '')
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(workflow?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(workflow?.edges ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [taskSearch, setTaskSearch] = useState('')

  const nodeTypes = useMemo(() => ({ task: TaskNode }), [])
  const availableTasks = tasks.filter(t => t.enabled && `${t.name} ${t.description} ${Object.values(t.config || {}).join(' ')}`.toLowerCase().includes(taskSearch.toLowerCase()))

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    setEdges(eds => addEdge({ ...connection, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds))
  }, [setEdges])

  const addTask = useCallback((task: TaskPlugin, dropPoint?: { x: number; y: number }) => {
    setError('')
    const index = nodes.length
    const previous = nodes[index - 1]
    const id = `${task.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const position = dropPoint || { x: previous ? previous.position.x + 270 : 100, y: previous ? previous.position.y : 190 }
    const newNode: Node = {
      id,
      type: 'task',
      position,
      data: { label: task.name, taskType: task.type as TaskType, taskId: task.id, configSummary: summary(task) }
    }
    setNodes(ns => [...ns, newNode])
    if (previous) {
      setEdges(es => [...es, { id: `edge-${previous.id}-${id}`, source: previous.id, target: id, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }])
    }
  }, [nodes, setEdges, setNodes])

  const onDragStart = (event: React.DragEvent, task: TaskPlugin) => {
    event.dataTransfer.setData('application/unified-test-hub-task', task.id)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('application/unified-test-hub-task')
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    // Dropped tasks are appended to the execution sequence. The drop location is used only
    // for initial visual placement; connections define execution order.
    addTask(task, { x: Math.max(80, event.clientX - 420), y: Math.max(130, event.clientY - 180) })
  }, [tasks, addTask])

  const removeNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const incoming = edges.find(e => e.target === nodeId)?.source
    const outgoing = edges.find(e => e.source === nodeId)?.target
    setNodes(ns => ns.filter(n => n.id !== nodeId))
    setEdges(es => {
      const remaining = es.filter(e => e.source !== nodeId && e.target !== nodeId)
      if (incoming && outgoing) remaining.push({ id: `edge-${incoming}-${outgoing}-${Date.now()}`, source: incoming, target: outgoing, animated: true, markerEnd: { type: MarkerType.ArrowClosed } })
      return remaining
    })
  }

  const save = async () => {
    setError('')
    if (!name.trim()) return setError('Enter a workflow name before saving.')
    if (!nodes.length) return setError('Drag at least one saved task into the workflow before saving.')
    setSaving(true)
    try {
      await api.createWorkflow({
        id: workflow?.id,
        name: name.trim(),
        description: description.trim(),
        nodes: nodes as any,
        edges: edges as any,
        status: 'SUCCESS',
        taskCount: nodes.length,
        modifiedAt: 'just now',
        lastRun: workflow?.lastRun ?? 'Never'
      })
      await onSaved()
    } catch (e: any) {
      setError(e?.message || 'Unable to save workflow.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="builder-page">
    <div className="builder-toolbar">
      <button className="secondary-btn" onClick={onBack}><ArrowLeft size={16} /> Workflows</button>
      <div className="builder-title">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Workflow name" />
        <input className="builder-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add workflow description..." />
      </div>
      <div className="builder-count">{nodes.length} {nodes.length === 1 ? 'task' : 'tasks'}</div>
      <button className="secondary-btn" disabled={!nodes.length}><Play size={16} /> Run</button>
      <button className="primary-btn" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Workflow'}</button>
    </div>

    {error && <div className="builder-error"><X size={16} /> {error}</div>}

    <div className="builder-layout">
      <aside className="task-palette">
        <div className="palette-title"><div><strong>Saved Tasks</strong><small>Reusable configured task instances</small></div><GripVertical size={17} /></div>
        <div className="palette-search"><Search size={14}/><input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Search saved tasks..."/></div>
        <p className="palette-hint">Drag an existing task onto the canvas. You are adding the saved task configuration — not creating a new plugin here.</p>
        {availableTasks.map(task => { const Icon = iconMap[task.type] || Database; return <div className="palette-task draggable-task" key={task.id} draggable onDragStart={e => onDragStart(e, task)} onClick={() => addTask(task)} title="Drag to canvas or click to add">
          <span className={`mini-task ${task.type.toLowerCase()}`}><Icon size={15}/></span>
          <span><strong>{task.name}</strong><small>{task.type}</small>{summary(task) && <em>{summary(task)}</em>}</span>
          <GripVertical size={14} className="drag-grip"/>
        </div> })}
        {!availableTasks.length && <div className="empty-palette">No saved tasks match your search. Create tasks first from the Tasks menu.</div>}
        <div className="palette-footer"><strong>{availableTasks.length}</strong> saved task{availableTasks.length === 1 ? '' : 's'} available</div>
      </aside>

      <div className="canvas-wrap" onDragOver={e => e.preventDefault()} onDrop={onDrop}>
        <div className="canvas-help">Drag saved tasks from the left and drop them here. Each dropped task is appended to the workflow sequence.</div>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} fitView deleteKeyCode="Delete">
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <aside className="sequence-panel">
        <div className="sequence-header"><div><strong>Workflow Steps</strong><small>Execution order</small></div><span>{nodes.length}</span></div>
        {!nodes.length ? <div className="sequence-empty"><div><GripVertical size={20}/></div><strong>Drop your first task</strong><small>Create and save task instances first, then drag them here to build the workflow.</small></div> :
          <div className="sequence-list">{nodes.map((node, index) => { const task = tasks.find(t => t.id === node.data?.taskId); return <div className="sequence-item" key={node.id}>
            <div className="sequence-number">{index + 1}</div>
            <div className="sequence-info"><strong>{node.data?.label}</strong><small>{task?.type || node.data?.taskType}</small>{task && summary(task) && <em>{summary(task)}</em>}</div>
            <button title="Remove step" onClick={() => removeNode(node.id)}><Trash2 size={14}/></button>
          </div> })}</div>}
        {nodes.length > 0 && <div className="sequence-note">The workflow stores references to these saved task IDs. Updating a task changes its configuration for future workflow runs.</div>}
      </aside>
    </div>
  </div>
}
