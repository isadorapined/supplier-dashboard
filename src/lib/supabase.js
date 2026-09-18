import { createClient } from '@supabase/supabase-js'

// Both values come from Vite env vars and are inlined at build time. They are
// the project URL and the anon/publishable key — never the service role key,
// which this tool does not use. See docs/supabase-setup.md.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// A key copied by mouse selection instead of the dashboard's copy button keeps
// the displayed "…" ellipsis, and supabase-js then throws inside Headers before
// any request leaves the browser, with nothing in the Supabase logs. Catch it
// here so the cause is on screen rather than in the console.
export const configError = (() => {
  if (!url || !anonKey) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  }
  if (anonKey.includes('…') || url.includes('…')) {
    return 'The Supabase key looks truncated. Copy it again with the Supabase copy button.'
  }
  return null
})()

// Unlike the portal's client, this one persists and refreshes the session: the
// dashboard is a logged-in tool and a reload must not drop the user out.
export const supabase = configError
  ? null
  : createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
