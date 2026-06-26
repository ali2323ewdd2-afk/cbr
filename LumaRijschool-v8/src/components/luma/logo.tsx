import { cn } from '@/lib/utils'

export function LumaLogo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-2xl bg-blue-gradient shadow-luma', className)}
      style={{ width: size, height: size }}
      aria-label="LumaRijschool logo"
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="#fff" strokeWidth={2.3} strokeLinecap="round">
        <circle cx="12" cy="12" r="4.4" fill="#fff" stroke="none" />
        <path d="M12 2.4v2.6M12 19v2.6M21.6 12H19M5 12H2.4M18.8 5.2l-1.8 1.8M7 17l-1.8 1.8M18.8 18.8 17 17M7 7 5.2 5.2" />
      </svg>
    </span>
  )
}

export function LumaWordmark({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LumaLogo size={36} />
      <span className="font-display font-extrabold text-xl tracking-tight" style={{ color: dark ? '#fff' : '#0B1B3B' }}>
        Luma<span style={{ color: '#2563EB' }}>Rijschool</span>
      </span>
    </span>
  )
}
