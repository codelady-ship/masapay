import { FlaskConical } from 'lucide-react'
import { DEMO_TABLE_PATH } from '@/demo/demo-mode'

// Always-visible label of the static demo: made-up data, no real payments. It
// sits at the bottom so it never covers the fixed site header.
export function DemoBanner() {
  const tableHref = `${import.meta.env.BASE_URL}${DEMO_TABLE_PATH.slice(1)}`
  return (
    <div
      role="note"
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-black px-4 py-2 text-center text-xs text-white sm:text-sm"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <FlaskConical className="size-4 text-brand-green" aria-hidden />
        DEMO
      </span>
      <span>Saxta məlumat, real ödəniş yoxdur.</span>
      <a
        href={tableHref}
        className="font-semibold text-brand-green underline underline-offset-2"
      >
        Masa demosunu aç
      </a>
    </div>
  )
}
