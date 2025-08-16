/**
 * @fileoverview Custom React Hook for Mobile Detection.
 * @description This frontend (FE) file defines a custom React hook, `useIsMobile`, that
 * determines if the application is being viewed on a mobile-sized screen.
 *
 * How it works:
 * - It uses the `window.matchMedia` browser API to check if the screen width is below
 *   a predefined `MOBILE_BREAKPOINT` (768px).
 * - It sets up an event listener to update its state whenever the screen size changes
 *   (e.g., on window resize or device rotation).
 * - It returns a boolean value (`true` if mobile, `false` otherwise), allowing components
 *   to conditionally render different layouts or elements based on the screen size.
 *
 * This hook is used in components like the `Sidebar` to switch between a persistent
 * sidebar on desktop and a slide-out "sheet" on mobile.
 *
 * Linked Files:
 * - `src/components/ui/sidebar.tsx`: Imports and uses this hook to change its behavior
 *   on mobile devices.
 * - `src/components/dashboard/documentation/index.tsx`: Uses this hook to conditionally render
 *   the mobile navigation trigger.
 *
 * Tech Used:
 * - React: For `useState` and `useEffect` hooks.
 * - Browser APIs: `window.matchMedia` for responsive checks.
 */
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
