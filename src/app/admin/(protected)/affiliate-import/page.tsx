'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload, AlertTriangle } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'

function BrutalCard({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`relative border-[3px] border-black bg-white p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] ${className}`}>
      <div className="absolute -top-4 left-5 border-[3px] border-black bg-white px-4 py-1 text-xs font-black uppercase tracking-[0.16em] shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
        {title}
      </div>
      {children}
    </div>
  )
}

type ImportResult = {
  success?: boolean
  importedRows?: number
  skippedDuplicates?: number
  matchedInfluencers?: number
  unmatchedTrackingIds?: string[]
  error?: string
}

export default function AdminAffiliateImportPage() {
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const rowEstimate = useMemo(() => {
    return csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean).length
  }, [csvText])

  const handleFileUpload = async (file: File) => {
    try {
      const text = await file.text()
      setCsvText(text)
      toast.success(`Loaded ${file.name}`)
    } catch (error) {
      console.error('Failed to read import file:', error)
      toast.error('Could not read that file')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvText.trim()) {
      toast.error('Paste or upload an Amazon report first')
      return
    }

    setImporting(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/affiliate/amazon-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Import failed')
      }

      setResult(data)
      toast.success('Amazon report imported')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      setResult({ error: message })
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-black/70 transition hover:-translate-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to admin
            </Link>
            <h1 className="text-4xl font-black uppercase tracking-tight text-black md:text-5xl">
              Amazon Report Import
            </h1>
            <p className="mt-3 max-w-3xl text-base font-semibold text-black/60">
              Upload or paste an Amazon Associates report and Kiwikoo will map rows to influencers using their saved tracking IDs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/analytics" className="rounded-full border border-black bg-white px-5 py-2.5 text-sm font-bold">
              Analytics
            </Link>
            <Link href="/admin" className="rounded-full border border-black bg-[#FFD93D] px-5 py-2.5 text-sm font-bold">
              Reviews
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <BrutalCard title="Report Upload">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="rounded-[20px] border-[3px] border-dashed border-black bg-[#FFF8DB] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black uppercase">CSV or Text Export</h2>
                    <p className="mt-1 text-sm font-semibold text-black/65">
                      Works with pasted CSV text or spreadsheet exports saved as CSV/tab-delimited text.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-[3px] border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[4px_4px_0_0_#000]">
                    <Upload className="h-4 w-4" />
                    Upload File
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv,text/csv,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.currentTarget.value = ''
                        if (file) void handleFileUpload(file)
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="amazon-import-text" className="block text-sm font-black uppercase tracking-[0.14em] text-black">
                  Amazon report content
                </label>
                <textarea
                  id="amazon-import-text"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={'Tracking ID,Date,Ordered Items,Shipped Items,Revenue,Commission\nrahulinsta-21,2026-05-18,3,2,4599.00,324.50'}
                  className="min-h-[360px] w-full resize-y rounded-[18px] border-[3px] border-black bg-white p-4 font-mono text-sm font-medium text-black focus:outline-none focus:shadow-[6px_6px_0_0_rgba(0,0,0,1)]"
                  spellCheck={false}
                />
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-black/45">
                  {rowEstimate > 0 ? `${Math.max(0, rowEstimate - 1)} data rows detected` : 'No rows loaded yet'}
                </p>
              </div>

              <button
                type="submit"
                disabled={importing || !csvText.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border-[3px] border-black bg-black px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[6px_6px_0_0_#000] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#FFD93D] hover:text-black hover:shadow-[8px_8px_0_0_#000] disabled:cursor-not-allowed disabled:bg-black/50 disabled:shadow-none"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Importing report
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-5 w-5" />
                    Import Amazon Report
                  </>
                )}
              </button>
            </form>
          </BrutalCard>

          <div className="space-y-8">
            <BrutalCard title="How It Works">
              <div className="space-y-4 text-sm font-semibold text-black/75">
                <p>1. Creator saves their Amazon Tracking ID in Kiwikoo.</p>
                <p>2. Kiwikoo generates masked product links with that tag attached.</p>
                <p>3. Amazon report rows are matched back to the creator by Tracking ID.</p>
                <p>4. Imported shipped revenue and commission appear in analytics.</p>
              </div>
            </BrutalCard>

            <BrutalCard title="Import Result">
              {result ? (
                result.error ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-[18px] border-[3px] border-black bg-[#FFE1DB] p-4 shadow-[4px_4px_0_0_#000]">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-black uppercase">Import failed</p>
                        <p className="mt-1 text-sm font-semibold text-black/70">{result.error}</p>
                      </div>
                    </div>
                    {result.unmatchedTrackingIds?.length ? (
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">Unmatched Tracking IDs</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.unmatchedTrackingIds.map((item) => (
                            <span key={item} className="rounded-full border-[2px] border-black bg-white px-3 py-1 text-xs font-black uppercase">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex items-start gap-3 rounded-[18px] border-[3px] border-black bg-[#E7FFD1] p-4 shadow-[4px_4px_0_0_#000]">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-black uppercase">Import completed</p>
                        <p className="mt-1 text-sm font-semibold text-black/70">
                          Imported {result.importedRows || 0} rows and skipped {result.skippedDuplicates || 0} duplicates.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[16px] border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/45">Imported</p>
                        <p className="mt-2 text-3xl font-black">{result.importedRows || 0}</p>
                      </div>
                      <div className="rounded-[16px] border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_#000]">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-black/45">Matched Creators</p>
                        <p className="mt-2 text-3xl font-black">{result.matchedInfluencers || 0}</p>
                      </div>
                    </div>

                    {result.unmatchedTrackingIds?.length ? (
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-black/45">Unmatched Tracking IDs</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {result.unmatchedTrackingIds.map((item) => (
                            <span key={item} className="rounded-full border-[2px] border-black bg-[#FFF4CC] px-3 py-1 text-xs font-black uppercase">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-black/65">
                        All imported rows matched saved creator tracking IDs.
                      </p>
                    )}
                  </div>
                )
              ) : (
                <p className="text-sm font-semibold text-black/60">
                  Import feedback will show here after you upload a report.
                </p>
              )}
            </BrutalCard>
          </div>
        </div>
      </div>
    </div>
  )
}
