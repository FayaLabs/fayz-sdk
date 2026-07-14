// Physical table names for the tasks plugin (plg_tasks_* prefix). Import T and
// reference T.<key> in the data provider so a rename lands in exactly one place.
export const T = {
  tasks: 'plg_tasks_tasks',
  labels: 'plg_tasks_labels',
} as const
