import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Button, ErrorMessage, Field, Panel, SectionHeading, inputClass } from './ui.jsx'

// Change password — the signed-in user's own password only (access matrix §6
// line 13). Supabase Auth's updateUser() acts on the current session, so there
// is no way to aim it at a colleague; a forgotten password is the Admin's
// reset, from the Admin Panel.

const MIN_LENGTH = 8

export default function ChangePassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== password
  const canSave = password.length >= MIN_LENGTH && confirm === password && !busy

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave) return
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) {
      setError('Password not changed. Try again.')
      return
    }
    setPassword('')
    setConfirm('')
    setSaved(true)
  }

  return (
    <section className="max-w-md space-y-6">
      <SectionHeading id="change-password">Change password</SectionHeading>

      {saved ? (
        <Panel as="div" className="space-y-3 p-4">
          <p className="text-sm text-deep">Your password has been changed.</p>
          <Button variant="secondary" onClick={onDone}>
            Back to the dashboard
          </Button>
        </Panel>
      ) : (
        <Panel as="form" className="space-y-4 p-4" onSubmit={handleSubmit} noValidate>
          <Field
            label="New password"
            htmlFor="new-password"
            hint={`At least ${MIN_LENGTH} characters.`}
          >
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password">
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>

          <ErrorMessage>
            {error ||
              (tooShort ? `Use at least ${MIN_LENGTH} characters.` : '') ||
              (mismatch ? 'The two passwords do not match.' : '')}
          </ErrorMessage>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!canSave}>
              {busy ? 'Saving…' : 'Change password'}
            </Button>
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </Panel>
      )}
    </section>
  )
}
