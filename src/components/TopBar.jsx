import { ROLE_LABELS } from '../lib/data.js'

// Persistent top bar: tool name, the three section anchors, the logged-in
// user's email and role, Change password, the Admin Panel link (current Admin
// only) and Log out. Deep Space Blue, per the brand.
export default function TopBar({ email, role, isAdmin, view, onLogout, onNavigate, showAnchors }) {
  function go(event, to) {
    event.preventDefault()
    onNavigate(to)
  }

  return (
    <header className="sticky top-0 z-10 bg-deep text-mint">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <a href="/" onClick={(e) => go(e, '/')} className="font-heading text-base font-medium">
          Supplier Review Dashboard
        </a>

        {showAnchors ? (
          <nav className="flex gap-4 text-sm">
            <a href="#overview" className="hover:underline">
              Overview
            </a>
            <a href="#risk-flags" className="hover:underline">
              Risk Flags
            </a>
            <a href="#register" className="hover:underline">
              Register
            </a>
          </nav>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-mint">
            {email} · {ROLE_LABELS[role] ?? role}
          </span>
          {isAdmin ? (
            <a
              href="/admin"
              onClick={(e) => go(e, '/admin')}
              aria-current={view === 'admin' ? 'page' : undefined}
              className="underline hover:opacity-80"
            >
              Admin Panel
            </a>
          ) : null}
          <a
            href="/password"
            onClick={(e) => go(e, '/password')}
            aria-current={view === 'password' ? 'page' : undefined}
            className="underline hover:opacity-80"
          >
            Change password
          </a>
          <button type="button" onClick={onLogout} className="underline hover:opacity-80">
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
