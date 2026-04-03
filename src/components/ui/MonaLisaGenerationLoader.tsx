'use client'

interface MonaLisaGenerationLoaderProps {
  elapsedSeconds?: number
  title?: string
  description?: string
  className?: string
}

const GENERATION_STEPS = ['Analyzing garment', 'Matching source pose', 'Painting final details'] as const

export function MonaLisaGenerationLoader({
  elapsedSeconds = 0,
  title = 'Painting your try-on',
  description = 'The model is generating the try-on one source image at a time for higher fidelity.',
  className = '',
}: MonaLisaGenerationLoaderProps) {
  const progress = Math.min(92, 18 + elapsedSeconds * 6)
  const activeStep = Math.min(GENERATION_STEPS.length - 1, Math.floor(elapsedSeconds / 8))

  return (
    <div className={`rounded-[28px] border-[4px] border-black bg-[#FFF7E8] p-5 shadow-[8px_8px_0_0_#000] ${className}`}>
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div className="rounded-[24px] border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
          <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.22em] text-black/50">
            <span>Mona Lisa mode</span>
            <span>{elapsedSeconds}s</span>
          </div>
          <div className="flex items-center justify-center rounded-[18px] border-2 border-black bg-[#F7F0E2] p-3">
            <svg
              viewBox="0 0 180 200"
              role="img"
              aria-label="Mona Lisa inspired loading illustration"
              className="svg-drawing-loader"
              style={{ width: '11rem', height: '11rem' }}
            >
              <path d="M38 172c10-26 26-40 52-40s43 14 52 40" />
              <path d="M46 144c-5-14-6-26-6-39 0-42 20-78 49-78s49 36 49 78c0 12-2 25-7 39" />
              <path d="M58 79c5-28 18-46 32-46 15 0 28 20 33 50" />
              <path d="M62 86c8-9 17-14 28-14 11 0 20 5 28 14" />
              <path d="M67 103c4-5 9-8 14-8 6 0 10 3 14 8" />
              <path d="M101 103c4-5 8-8 14-8 5 0 10 3 14 8" />
              <path d="M83 120c3 3 5 4 8 4 3 0 5-1 8-4" />
              <path d="M74 134c7 5 13 7 20 7s13-2 20-7" />
              <path d="M54 58c6-14 18-24 35-24 18 0 31 10 38 26" />
              <path d="M48 164c9-10 23-16 41-16 19 0 33 5 44 16" />
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="inline-flex items-center rounded-full border-2 border-black bg-[#FFD93D] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
              Generating
            </div>
            <h3 className="mt-3 text-2xl font-black uppercase">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-black/70">{description}</p>
          </div>

          <div className="rounded-[20px] border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
            <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-black/50">
              <span>Canvas fill</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full border-2 border-black bg-[#F3EFE7]">
              <div
                className="h-full rounded-full border-r-2 border-black bg-[linear-gradient(90deg,#FFD93D_0%,#FF8C69_55%,#9CFF6B_100%)] transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {GENERATION_STEPS.map((step, index) => {
              const active = index <= activeStep
              return (
                <div
                  key={step}
                  className={`rounded-2xl border-[3px] p-3 text-sm font-black uppercase shadow-[3px_3px_0_0_#000] ${
                    active ? 'border-black bg-white' : 'border-black/30 bg-[#F3EFE7] text-black/40 shadow-none'
                  }`}
                >
                  <div className="text-[10px] tracking-[0.16em] text-black/45">Step {index + 1}</div>
                  <div className="mt-1 text-xs leading-4">{step}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
