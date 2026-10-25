import { useSyncExternalStore } from 'react'

/*
 * The landing page's sound effects, synthesized with Web Audio. Off until the visitor turns them on; nothing plays
 * by itself and nothing is downloaded. Every effect is a no-op while off.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
let on = false
let lastFlap = 0
const listeners = new Set<() => void>()

function ensure(): AudioContext | null {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.55
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp)
    comp.connect(ctx.destination)
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.6), ctx.sampleRate)
    const ch = noiseBuf.getChannelData(0)
    for (let i = 0; i < ch.length; i += 1) ch[i] = Math.random() * 2 - 1
  } catch {
    ctx = null
  }
  return ctx
}

interface ToneOptions {
  at?: number
  type?: OscillatorType
  gain?: number
  attack?: number
  lp?: number
}

function tone(freq: number, dur: number, o: ToneOptions = {}) {
  if (!on || !ctx || !master) return
  const t = ctx.currentTime + (o.at ?? 0)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = o.type ?? 'sine'
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.15, t + (o.attack ?? 0.008))
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  if (o.lp) {
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = o.lp
    g.connect(lp)
    lp.connect(master)
  } else g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

function noise(dur: number, o: { gain?: number; freq?: number; to?: number; q?: number } = {}) {
  if (!on || !ctx || !master || !noiseBuf) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const bf = ctx.createBiquadFilter()
  bf.type = 'bandpass'
  bf.frequency.setValueAtTime(o.freq ?? 2000, t)
  if (o.to) bf.frequency.exponentialRampToValueAtTime(o.to, t + dur)
  bf.Q.value = o.q ?? 1
  const g = ctx.createGain()
  g.gain.setValueAtTime(o.gain ?? 0.2, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bf)
  bf.connect(g)
  g.connect(master)
  src.start(t, Math.random() * 0.25)
  src.stop(t + dur + 0.02)
}

export const sound = {
  toggle() {
    on = !on
    if (on) {
      ensure()
      if (ctx?.state === 'suspended') void ctx.resume()
      sound.chime()
    }
    for (const l of listeners) l()
  },
  tick: () => noise(0.03, { gain: 0.1, freq: 3400, q: 5 }),
  flap() {
    if (!on || !ctx || ctx.currentTime - lastFlap < 0.024) return
    lastFlap = ctx.currentTime
    noise(0.022, { gain: 0.07, freq: 1600 + Math.random() * 1200, q: 2.5 })
  },
  chime() {
    tone(880, 0.55, { gain: 0.1 })
    tone(1318.5, 0.8, { gain: 0.08, at: 0.09 })
  },
  caution() {
    tone(659, 0.2, { type: 'triangle', gain: 0.11 })
    tone(659, 0.2, { type: 'triangle', gain: 0.11, at: 0.24 })
  },
  alarm() {
    for (let i = 0; i < 2; i += 1) {
      tone(540, 0.17, { type: 'square', gain: 0.05, lp: 1800, at: i * 0.5 })
      tone(405, 0.24, { type: 'square', gain: 0.05, lp: 1800, at: i * 0.5 + 0.19 })
    }
  },
  check() {
    tone(1046.5, 0.14, { type: 'triangle', gain: 0.11 })
    tone(1568, 0.22, { gain: 0.07, at: 0.06 })
  },
  uncheck: () => tone(523, 0.12, { type: 'triangle', gain: 0.08 }),
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
  )
}
