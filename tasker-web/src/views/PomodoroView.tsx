import { useEffect, useMemo, useState } from 'react'

const presets = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
]

const radius = 108
const circumference = 2 * Math.PI * radius
const maxCustomMinutes = 720

function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function formatDurationLabel(totalSeconds: number) {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes} min`
  if (hours > 0) return hours === 1 ? '1 hour' : `${hours} hours`

  return totalMinutes === 1 ? '1 minute' : `${totalMinutes} minutes`
}

type Session = { duration: number; remaining: number; deadline: number | null }
const focusKey = 'tasker.focus.v1'
function readSession(): Session {
  try {
    const value = JSON.parse(localStorage.getItem(focusKey) || 'null')
    if (
      value &&
      Number.isInteger(value.duration) &&
      value.duration > 0 &&
      value.duration <= maxCustomMinutes * 60 &&
      Number.isInteger(value.remaining) &&
      value.remaining >= 0 &&
      value.remaining <= value.duration &&
      (value.deadline === null || Number.isFinite(value.deadline))
    )
      return value
  } catch {
    /* Use a fresh session when browser storage is unavailable. */
  }
  return { duration: 1800, remaining: 1800, deadline: null }
}
function timeLeft(session: Session) {
  return session.deadline === null
    ? session.remaining
    : Math.max(0, Math.ceil((session.deadline - Date.now()) / 1000))
}
export function PomodoroView() {
  const [session, setSession] = useState(readSession)
  const [, tick] = useState(0)
  const durationSeconds = session.duration
  const remainingSeconds = timeLeft(session)
  const isRunning = session.deadline !== null && remainingSeconds > 0
  function persist(next: Session) {
    setSession(next)
    try {
      localStorage.setItem(focusKey, JSON.stringify(next))
    } catch {
      /* The timer still runs for this visit. */
    }
  }
  const [customHours, setCustomHours] = useState('0')
  const [customMinutes, setCustomMinutes] = useState('45')
  const [isStopConfirming, setIsStopConfirming] = useState(false)

  const progress = durationSeconds === 0 ? 0 : remainingSeconds / durationSeconds
  const isComplete = remainingSeconds === 0
  const hasStarted = remainingSeconds < durationSeconds || isRunning
  const selectedPreset = useMemo(
    () =>
      presets.find((preset) => preset.minutes * 60 === durationSeconds)?.label ??
      formatDurationLabel(durationSeconds),
    [durationSeconds],
  )

  useEffect(() => {
    const update = () => tick((value) => value + 1)
    const sync = (event: StorageEvent) => {
      if (event.key === focusKey) setSession(readSession())
    }
    const interval = isRunning ? window.setInterval(update, 500) : undefined
    window.addEventListener('focus', update)
    window.addEventListener('storage', sync)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', update)
      window.removeEventListener('storage', sync)
      document.removeEventListener('visibilitychange', update)
    }
  }, [isRunning])
  function selectPreset(minutes: number) {
    if (hasStarted && !isComplete && !window.confirm('Replace the current focus session?')) return
    persist({ duration: minutes * 60, remaining: minutes * 60, deadline: null })
    setIsStopConfirming(false)
  }

  function getCustomTotalMinutes() {
    const parsedHours = Number(customHours || 0)
    const parsedMinutes = Number(customMinutes || 0)
    const totalMinutes = parsedHours * 60 + parsedMinutes

    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null

    return Math.min(Math.round(totalMinutes), maxCustomMinutes)
  }

  function applyCustomTime() {
    const nextMinutes = getCustomTotalMinutes()
    if (nextMinutes === null) return

    selectPreset(nextMinutes)
    setCustomHours(String(Math.floor(nextMinutes / 60)))
    setCustomMinutes(String(nextMinutes % 60))
  }
  function toggleTimer() {
    const remaining = isComplete ? durationSeconds : timeLeft(session)
    persist({ ...session, remaining, deadline: isRunning ? null : Date.now() + remaining * 1000 })
    setIsStopConfirming(false)
  }
  function requestStop() {
    if (hasStarted) setIsStopConfirming(true)
  }
  function confirmStop() {
    persist({ duration: durationSeconds, remaining: durationSeconds, deadline: null })
    setIsStopConfirming(false)
  }

  const strokeOffset = circumference * (1 - progress)

  return (
    <section className="view pomodoro-view">
      <div className="view-header">
        <div>
          <p className="view-eyebrow">Focus</p>
          <h2 className="view-title">Pomodoro timer</h2>
          <p className="view-description">Choose a focus block and keep the session visible while you work.</p>
        </div>
      </div>

      <div className="pomodoro-shell card card--pad">
        <div className="pomodoro-ring" aria-label={`${formatTimer(remainingSeconds)} remaining`}>
          <svg className="pomodoro-ring__svg" viewBox="0 0 260 260" role="img" aria-hidden="true">
            <circle className="pomodoro-ring__track" cx="130" cy="130" r={radius} />
            <circle
              className="pomodoro-ring__progress"
              cx="130"
              cy="130"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
            />
          </svg>

          <div className="pomodoro-ring__content">
            <strong>{formatTimer(remainingSeconds)}</strong>
            <span>
              {isComplete
                ? 'Session finished'
                : isRunning
                  ? 'Focus session active'
                  : hasStarted
                    ? 'Paused'
                    : 'Ready to start'}
            </span>
          </div>
        </div>

        <div className="pomodoro-controls">
          <button className="button button--primary" onClick={toggleTimer} type="button">
            {isComplete ? 'Restart' : isRunning ? 'Pause' : hasStarted ? 'Resume' : 'Start'}
          </button>
          <button className="button button--danger" disabled={!hasStarted} onClick={requestStop} type="button">
            Stop session
          </button>
        </div>

        {isStopConfirming && (
          <div className="pomodoro-confirm" role="alert">
            <div>
              <strong>Confirm session reset</strong>
              <span>This will end the active focus block and reset the timer to {selectedPreset}.</span>
            </div>
            <div className="inline-actions">
              <button className="button button--ghost" onClick={() => setIsStopConfirming(false)} type="button">
                Keep session
              </button>
              <button className="button button--danger" onClick={confirmStop} type="button">
                End session
              </button>
            </div>
          </div>
        )}

        <div className="pomodoro-presets" aria-label="Focus presets">
          {presets.map((preset) => (
            <button
              className={`pomodoro-preset ${durationSeconds === preset.minutes * 60 ? 'is-selected' : ''}`}
              key={preset.minutes}
              onClick={() => selectPreset(preset.minutes)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="pomodoro-custom">
          <label className="form-label" htmlFor="custom-focus-hours">
            Hours
            <input
              className="field pomodoro-custom__input"
              id="custom-focus-hours"
              inputMode="numeric"
              max="12"
              min="0"
              onChange={(event) => setCustomHours(event.target.value)}
              placeholder="0"
              type="number"
              value={customHours}
            />
          </label>
          <label className="form-label" htmlFor="custom-focus-minutes">
            Minutes
            <input
              className="field pomodoro-custom__input"
              id="custom-focus-minutes"
              inputMode="numeric"
              max="59"
              min="0"
              onChange={(event) => setCustomMinutes(event.target.value)}
              placeholder="45"
              type="number"
              value={customMinutes}
            />
          </label>
          <button className="button" onClick={applyCustomTime} type="button">
            Set time
          </button>
        </div>
      </div>
    </section>
  )
}
