I would definitely split it into proper components. Right now too much of the UI responsibility is concentrated in App.tsx, which will become difficult to maintain as the application grows.

For the Unified Test Hub, I'd structure it more like this:
unified-test-hub/
│
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── AppProviders.tsx
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarSection.tsx
│   │   │   └── UserMenu.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchBox.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── Loading.tsx
│   │   │
│   │   └── workflow/
│   │       ├── WorkflowCanvas.tsx
│   │       ├── TaskPalette.tsx
│   │       ├── WorkflowNode.tsx
│   │       ├── WorkflowToolbar.tsx
│   │       └── TaskConfigPanel.tsx
│   │
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── TasksPage.tsx
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   ├── TaskForm.tsx
│   │   │   └── task-config/
│   │   │       ├── DbRefreshForm.tsx
│   │   │       ├── AutosysForm.tsx
│   │   │       ├── ManualTaskForm.tsx
│   │   │       ├── ApiTaskForm.tsx
│   │   │       └── SqlTaskForm.tsx
│   │   │
│   │   ├── workflows/
│   │   │   ├── WorkflowsPage.tsx
│   │   │   ├── WorkflowList.tsx
│   │   │   └── WorkflowBuilderPage.tsx
│   │   │
│   │   └── executions/
│   │       ├── ExecutionsPage.tsx
│   │       └── ExecutionDetailsPage.tsx
│   │
│   ├── services/
│   │   ├── apiClient.ts
│   │   ├── taskService.ts
│   │   ├── workflowService.ts
│   │   └── executionService.ts
│   │
│   ├── types/
│   │   ├── task.ts
│   │   ├── workflow.ts
│   │   └── execution.ts
│   │
│   ├── hooks/
│   │   ├── useTasks.ts
│   │   ├── useWorkflows.ts
│   │   └── useExecutions.ts
│   │
│   └── styles/
│       ├── variables.css
│       ├── layout.css
│       ├── components.css
│       └── workflow.css
│
├── server/
│   ├── index.ts
│   ├── routes/
│   │   ├── taskRoutes.ts
│   │   ├── workflowRoutes.ts
│   │   └── executionRoutes.ts
│   ├── services/
│   │   └── mockDataService.ts
│   └── data/
│       └── db.json
│
├── package.json
├── vite.config.ts
└── README.md

And more importantly, I'd change the architecture

The Sidebar and Header should be global, not recreated inside individual pages.

                 ┌───────────────────────────────────────┐
                 │              Header                   │
                 │ Search       Notifications    User   │
                 ├──────────────┬────────────────────────┤
                 │              │                        │
                 │   Sidebar    │      Page Content      │
                 │              │                        │
                 │ Home         │                        │
                 │              │                        │
                 │ Tasks        │   Dashboard            │
                 │  DB Refresh  │   / Tasks              │
                 │  Autosys     │   / Workflows          │
                 │  Manual      │   / Executions         │
                 │              │                        │
                 │ Workflows    │                        │
                 │              │                        │
                 │ Executions   │                        │
                 │              │                        │
                 └──────────────┴────────────────────────┘

  Then the routing becomes clean:
  /
  ├── /dashboard
  │
  ├── /tasks
  │   ├── /tasks/db-refresh
  │   ├── /tasks/autosys
  │   ├── /tasks/manual
  │   └── /tasks/:id/edit
  │
  ├── /workflows
  │   ├── /workflows
  │   ├── /workflows/new
  │   └── /workflows/:id/edit
  │
  └── /executions
      └── /executions/:id

  Most important change: Task architecture

I would also separate Task Type from Task Instance in the code.

TaskType
    ↓
DB_REFRESH
    ↓
Task Plugin
    ↓
DB Refresh configuration
    ↓
Saved Task Instance
    ↓
"My DB Refresh"
    ↓
database = dev1
schema = TEST
refreshMode = FULL
