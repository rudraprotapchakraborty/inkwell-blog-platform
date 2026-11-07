export default function Loading() {
  return (
    <div className="frame py-16" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-6 h-14 w-full max-w-xl" />
      <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i}>
            <div className="skeleton aspect-[16/10] w-full" />
            <div className="skeleton mt-5 h-5 w-3/4" />
            <div className="skeleton mt-3 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
