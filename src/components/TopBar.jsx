// Persistent top bar: tool name, the three section anchors, the logged-in
// user's email and Log out. Deep Space Blue, per the brand.
export default function TopBar({ email, onLogout, onHome, showAnchors }) {
  return (
    <header className="sticky top-0 z-10 bg-deep text-mint">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <button type="button" onClick={onHome} className="font-heading text-base font-medium">
          Supplier Review Dashboard
        </button>

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

        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-mint">{email}</span>
          <button type="button" onClick={onLogout} className="underline hover:opacity-80">
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
