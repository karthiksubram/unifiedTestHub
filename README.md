# Unified Test Hub

React + Vite UI with a Node/Express mock API for the Unified Test Hub workflow application. The mock API persists changes to `server/data/db.json`.

## Domain model

The important distinction is **task type/plugin vs saved task instance**:

- A task type is a capability such as DB Refresh, Autosys Task, Manual Task, API Task, SQL Task, File Task or Validation Task.
- A saved task is a configured reusable instance of that type. For example: `My DB Refresh` -> `DB_REFRESH` -> database `dev1`, schema `TEST`, refresh mode `Full`.
- Workflows do not create/configure tasks. The Workflow Builder references existing saved task IDs and sequences them.

## Run

```bash
npm install
npm run dev
```

Web: http://localhost:5173
API: http://localhost:4000

## Workflow Builder

1. Go to a task type under **Tasks**.
2. Create and save one or more configured task instances.
3. Open **All Workflows -> New Workflow**.
4. The builder's left panel shows the saved task instances, not the plugin types.
5. Drag a saved task onto the canvas. Dropping a task appends it to the execution sequence and creates a node containing the task's saved ID/configuration reference.
6. Connect/rearrange the flow and save the workflow.

The mock backend prevents deletion of a task that is referenced by a workflow.

## Backend migration

The UI uses REST calls only. The Node mock API can later be replaced by the Python API/Celery implementation and MongoDB persistence without changing the workflow-builder contract.
