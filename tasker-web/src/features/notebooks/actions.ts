import { createSection, updateSection } from '../sections/api'
import { createTask, updateTask } from '../tasks/api'
import { createNotebookActionSet, type NotebookActionDependencies } from './actionCore'
import { uniqueNotebookName } from './utils'

export function createNotebookActions(dependencies: NotebookActionDependencies) {
  return createNotebookActionSet(dependencies, { createSection, createTask, uniqueNotebookName, updateSection, updateTask })
}
