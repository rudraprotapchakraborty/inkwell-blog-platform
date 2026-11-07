/** Brand-coloured spinner shown while a page or panel loads. */
export function LogoSpinner({ size = 40 }: { size?: number; src?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-line border-t-brand motion-reduce:animate-none"
      style={{ width: size * 0.6, height: size * 0.6 }}
    />
  )
}
