function Footer() {
  return (
    <footer className="border-t border-emerald-100/80 bg-white/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} Shubham Supermarket. All rights reserved.</p>
        <div className="flex items-center gap-5">
          <a href="#" className="transition hover:text-emerald-700">
            Privacy
          </a>
          <a href="#" className="transition hover:text-emerald-700">
            Terms
          </a>
          <a href="#" className="transition hover:text-emerald-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
