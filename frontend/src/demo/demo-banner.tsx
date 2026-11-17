import { useEffect, useRef } from 'react'
import { FlaskConical } from 'lucide-react'
import { DEMO_TABLE_PATH } from '@/demo/demo-mode'

// Always-visible label of the static demo: made-up data, no real payments. It
// sits at the bottom so it never covers the fixed site header, and the page
// keeps an equal gap at its end so the bar never covers the last buttons.
export function DemoBanner() {
  const tableHref = `${import.meta.env.BASE_URL}${DEMO_TABLE_PATH.slice(1)}`
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const body = document.body
    const root = document.documentElement
    const previous = [body.style.paddingBottom, root.style.scrollPaddingBottom]
    // The bar's height already includes the safe-area inset (its own padding),
    // and it changes when the text wraps on a narrow screen. Scroll padding keeps
    // focused or scrolled-to controls above the bar too.
    const reserve = () => {
      body.style.paddingBottom = `${bar.offsetHeight}px`
      root.style.scrollPaddingBottom = `${bar.offsetHeight}px`
    }
    reserve()
    const observer = new ResizeObserver(reserve)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      ;[body.style.paddingBottom, root.style.scrollPaddingBottom] = previous
    }
  }, [])

  return (
    <div
      ref={barRef}
      role="note"
      className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-black px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-center text-xs text-white sm:text-sm"
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
