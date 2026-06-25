import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-[#0B1B3B] text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display font-extrabold text-2xl mb-3">
            Luma<span className="text-[#5C8BFF]">Rijschool</span>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
            Leer slimmer. Slaag sneller. Het slimste theorieplatform van Nederland.
          </p>
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-400 mb-3">Product</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#features" className="hover:text-[#5C8BFF]">Functies</Link></li>
            <li><Link href="/#pricing" className="hover:text-[#5C8BFF]">Abonnementen</Link></li>
            <li><Link href="/lessons" className="hover:text-[#5C8BFF]">Lessen</Link></li>
            <li><Link href="/exams" className="hover:text-[#5C8BFF]">Examens</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-400 mb-3">Support</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/#faq" className="hover:text-[#5C8BFF]">Helpcentrum</Link></li>
            <li><Link href="/contact" className="hover:text-[#5C8BFF]">Contact</Link></li>
            <li><Link href="/tutor" className="hover:text-[#5C8BFF]">AI Tutor</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-400 mb-3">Juridisch</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-[#5C8BFF]">Privacy</Link></li>
            <li><Link href="/terms" className="hover:text-[#5C8BFF]">Voorwaarden</Link></li>
            <li><Link href="/cookies" className="hover:text-[#5C8BFF]">Cookiebeleid</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>© 2026 LumaRijschool · Alle rechten voorbehouden</div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1FB871] animate-pulse-soft" /> 342 studenten online
            </span>
            <span>Gemaakt in Nederland 🇳🇱</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
