import { useState } from 'react'
import { supabase, configError } from '../lib/supabase.js'
import { Button, ErrorMessage, Field, inputClass, Panel } from './ui.jsx'

// View 1. No supplier data is fetched here or anywhere before a session
// exists — App renders this view for every logged-out visitor, whatever the
// URL. There is no sign-up link and no forgot-password link: accounts are
// created by the builder in Supabase, and signup is off at the Auth level.
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      // One message whichever field was wrong, so the form never confirms
      // that an address is a real account.
      setError('Email or password not recognised.')
      setBusy(false)
      return
    }
    // On success the auth listener in App swaps to View 2.
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-mint px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 font-heading text-2xl font-medium text-teal">Data Leaf</p>
        <Panel as="div" className="p-6">
          <h1 className="mb-6 text-xl text-deep">Supplier Review Dashboard</h1>

          {configError ? (
            <ErrorMessage>{configError}</ErrorMessage>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field label="Email" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>

              <Field label="Password" htmlFor="password">
                <input
                  id="password"
                  type="password"
                  className={inputClass}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>

              <ErrorMessage>{error}</ErrorMessage>

              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Logging in…' : 'Log in'}
              </Button>
            </form>
          )}
        </Panel>
      </div>
    </main>
  )
}
