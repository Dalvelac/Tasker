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

export function PomodoroView() {
  const [durationSeconds, setDurationSeconds] = useState(presets[0].minutes * 60)
  const [remainingSeconds, setRemainingSeconds] = useState(presets[0].minutes * 60)
  const [customHours, setCustomHours] = useState('')
  const [customMinutes, setCustomMinutes] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [isStopConfirming, setIsStopConfirming] = useState(false)

  const progress = durationSeconds === 0 ? 0 : remainingSeconds / durationSeconds
  const isComplete = remainingSeconds === 0
  const hasStarted = remainingSeconds < durationSeconds || isRunning
  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.minutes * 60 === durationSeconds)?.label ?? formatDurationLabel(durationSeconds),
    [durationSeconds],
  )

  useEffect(() => {
    if (!isRunning) return

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setIsRunning(false)
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning])

  function selectPreset(minutes: number) {
    const nextDuration = minutes * 60
    setDurationSeconds(nextDuration)
    setRemainingSeconds(nextDuration)
    setIsRunning(false)
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

    const nextDuration = nextMinutes * 60
    setDurationSeconds(nextDuration)
    setRemainingSeconds(nextDuration)
    setCustomHours(String(Math.floor(nextMinutes / 60)))
    setCustomMinutes(String(nextMinutes % 60))
    setIsRunning(false)
    setIsStopConfirming(false)
  }

  function toggleTimer() {
    if (isComplete) {
      setRemainingSeconds(durationSeconds)
      setIsRunning(true)
      setIsStopConfirming(false)
      return
    }

    setIsRunning((current) => !current)
    setIsStopConfirming(false)
  }

  function requestStop() {
    if (!hasStarted) return
    setIsRunning(false)
    setIsStopConfirming(true)
  }

  function confirmStop() {
    setRemainingSeconds(durationSeconds)
    setIsRunning(false)
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
            <span className="pill">{isComplete ? 'complete' : isRunning ? 'in progress' : selectedPreset}</span>
            <strong>{formatTimer(remainingSeconds)}</strong>
            <span>{isComplete ? 'Session finished' : isRunning ? 'Focus session active' : 'Ready to start'}</span>
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
