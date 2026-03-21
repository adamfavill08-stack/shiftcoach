// Task model - matches Simple Calendar Pro Task.kt
export interface Task {
  id?: number | null
  taskId: number // References events.id where type = TYPE_TASK
  startTS: number
  flags: number // FLAG_TASK_COMPLETED
  createdAt?: string
  updatedAt?: string
}

export const FLAG_TASK_COMPLETED = 8

export function isTaskCompleted(task: Task): boolean {
  return (task.flags & FLAG_TASK_COMPLETED) !== 0
}

