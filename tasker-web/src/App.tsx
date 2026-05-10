import { useEffect, useState, type FormEvent } from 'react'
import './App.css'

type Task = {
  id: number
  title: string
  notes: string | null
  status: string
  priority: string
  due_date: string | null
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState('')

  async function loadTasks() {
    const res = await fetch('/api/tasks')
    const data = (await res.json()) as Task[]
    setTasks(data)
  }

  async function addTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    })

    setTitle('')
    await loadTasks()
  }

  async function toggleTask(id: number) {
    await fetch(`/api/tasks?id=${id}`, {
      method: 'PATCH',
    })

    await loadTasks()
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks?id=${id}`, {
      method: 'DELETE',
    })

    await loadTasks()
  }

  useEffect(() => {
    loadTasks()
  }, [])

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1>Tasker</h1>

      <form onSubmit={addTask} style={{ display: 'flex', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nueva tarea..."
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit">Anadir</button>
      </form>

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {tasks.map((task) => (
          <li
            key={task.id}
            style={{
              marginTop: 12,
              padding: 12,
              border: '1px solid #ddd',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => toggleTask(task.id)}>
                {task.status === 'done' ? 'Reabrir' : 'Hecho'}
              </button>
              <button type="button" onClick={() => deleteTask(task.id)}>
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
