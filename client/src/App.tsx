import { useEffect, useState } from 'react'

type HealthState =
  | { status: 'loading' }
  | { status: 'ok' }
  | { status: 'error'; message: string }

function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/health', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`)
        return res.json() as Promise<{ status: string }>
      })
      .then((data) => {
        if (data.status === 'ok') setHealth({ status: 'ok' })
        else throw new Error(`Unexpected status: ${data.status}`)
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setHealth({
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      })

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>Helpdesk</h1>
      {health.status === 'loading' && <p>Checking server health…</p>}
      {health.status === 'ok' && <p>✅ Server is healthy</p>}
      {health.status === 'error' && (
        <p>❌ Server health check failed: {health.message}</p>
      )}
    </main>
  )
}

export default App
