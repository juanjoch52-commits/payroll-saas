'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, PenLine, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDocumentUrl, signDocument } from '@/app/actions/documents'

type Doc = {
  id: string
  name: string
  kind: string
  storage_path: string | null
  requires_signature: boolean
  signed: boolean
}

export function MyDocuments({ docs }: { docs: Doc[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [signing, setSigning] = useState<Doc | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download(id: string) {
    setError(null)
    const res = await getDocumentUrl(id)
    if (res.success) window.open(res.url, '_blank')
    else setError(res.error)
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {docs.length === 0 && <p className="text-sm text-muted-foreground">{t('documents.none')}</p>}
      {docs.map((d) => (
        <div key={d.id} className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`documents.kinds.${d.kind}` as 'documents.kinds.other')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {d.storage_path && (
                <Button size="sm" variant="ghost" onClick={() => download(d.id)}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              {d.requires_signature &&
                (d.signed ? (
                  <span className="flex items-center gap-1 text-xs text-success-foreground">
                    <CheckCircle2 className="h-4 w-4" /> {t('documents.signed')}
                  </span>
                ) : (
                  <Button size="sm" className="gap-1" onClick={() => setSigning(d)}>
                    <PenLine className="h-4 w-4" /> {t('documents.sign')}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      ))}

      {signing && (
        <SignatureModal
          doc={signing}
          t={t}
          onClose={() => setSigning(null)}
          onSigned={() => {
            setSigning(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function SignatureModal({
  doc,
  t,
  onClose,
  onSigned,
}: {
  doc: Doc
  t: ReturnType<typeof useTranslations>
  onClose: () => void
  onSigned: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function coords(e: React.PointerEvent) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return {
      x: (e.clientX - r.left) * (c.width / r.width),
      y: (e.clientY - r.top) * (c.height / r.height),
    }
  }
  function down(e: React.PointerEvent) {
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = coords(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    canvasRef.current!.setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = coords(e)
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  function clear() {
    const c = canvasRef.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
  }

  async function submit() {
    setErr(null)
    setBusy(true)
    const base64 = canvasRef.current!.toDataURL('image/png').split(',')[1]
    const res = await signDocument(doc.id, name, base64)
    setBusy(false)
    if (res.success) onSigned()
    else setErr(res.error ?? 'Error')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-3 rounded-xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold">{t('documents.signTitle')}</h3>
        <p className="text-sm text-muted-foreground">{doc.name}</p>
        <Input placeholder={t('documents.yourName')} value={name} onChange={(e) => setName(e.target.value)} />
        <div className="overflow-hidden rounded-md border bg-white">
          <canvas
            ref={canvasRef}
            width={320}
            height={140}
            className="w-full touch-none"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
          />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clear}>
            {t('documents.clear')}
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" disabled={busy || !name.trim()} onClick={submit}>
            {busy ? t('common.loading') : t('documents.confirmSign')}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">{t('documents.legalNote')}</p>
      </div>
    </div>
  )
}
