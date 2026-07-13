'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type TimePosition = {
  ts: number // unix ms
  lat: number
  lng: number
  workerId: string
  label: string
}

/**
 * Slider que filtra puntos por timestamp y permite "rebobinar" un día completo.
 * No interactúa directamente con el mapa — provee `currentTs` y `onChange`
 * para que el parent filtre los puntos que pasa al LiveMap.
 *
 * Útil para responder "¿dónde estaba mi equipo a las 11am?".
 */
export function TimeTravelSlider({
  startTs,
  endTs,
  onChange,
  className,
}: {
  startTs: number
  endTs: number
  onChange: (ts: number) => void
  className?: string
}) {
  const [currentTs, setCurrentTs] = useState(startTs)
  const [playing, setPlaying] = useState(false)

  const totalMs = endTs - startTs
  const percent = useMemo(
    () => Math.round(((currentTs - startTs) / Math.max(totalMs, 1)) * 100),
    [currentTs, startTs, totalMs],
  )

  const handleChange = (v: number) => {
    setCurrentTs(v)
    onChange(v)
  }

  // Play / pause loop
  useState(() => {
    if (!playing) return
    const step = totalMs / 60 // 60 frames over the range
    const id = setInterval(() => {
      setCurrentTs((t) => {
        const next = t + step
        if (next >= endTs) {
          setPlaying(false)
          return endTs
        }
        onChange(next)
        return next
      })
    }, 200)
    return () => clearInterval(id)
  })

  const currentDate = new Date(currentTs)
  const formattedTime = currentDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-background/95 px-4 py-3 shadow-md backdrop-blur ${className ?? ''}`}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>

      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="min-w-[10ch] text-xs font-medium tabular-nums">{formattedTime}</span>

      <div className="relative flex-1">
        <input
          type="range"
          min={startTs}
          max={endTs}
          step={(endTs - startTs) / 120}
          value={currentTs}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
        <motion.div
          className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
          style={{ left: `${percent}%` }}
          initial={false}
          animate={{ opacity: 1 }}
        >
          {percent}%
        </motion.div>
      </div>
    </div>
  )
}
