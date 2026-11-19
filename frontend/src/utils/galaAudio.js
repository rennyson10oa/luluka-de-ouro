/**
 * galaAudio — motor de som da cerimônia.
 *
 * DRUMROLL = sample REAL (assets/drumroll.mp3, 6s, 183KB) da Mixkit
 * (licença gratuita, sem atribuição). Tentativa anterior: síntese pura de
 * caixa com ruído — soava estática, não bateria (timbre convincente de
 * bateria é problema difícil; sample resolve). O sample é baixado só
 * quando o som é usado pela 1ª vez e fica cacheado pelo navegador.
 *
 * TADA da revelação = sintetizado em runtime (prato + thump), que soa
 * bem sem sample.
 *
 * Políticas de autoplay: o AudioContext só desperta num GESTO do usuário
 * (o clique no toggle), por isso o som é opt-in e a preferência persiste
 * em localStorage. Visita seguinte com som ativo: o contexto acorda no
 * 1º toque/tecla da página.
 *
 * Uso: RevealPage orquestra startDrumroll/stopDrumroll/playRevealHit
 * conforme a fase da cerimônia; o toggle chama toggleSound().
 */

const DRUMROLL_URL = '/assets/drumroll.mp3'

let ctx = null
let master = null
let noiseBuffer = null
// Sample decodificado (cache) + fonte/gain do loop em andamento.
let drumBuffer = null
let drumSource = null
let drumGain = null

const STORAGE_KEY = 'pg_som'

export function isSoundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Desperta (ou cria) o AudioContext. Retorna null se o navegador não
 * suportar Web Audio — todo o resto vira no-op silencioso.
 */
function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.5 // volume geral modesto: a gala não é show de metal
    master.connect(ctx.destination)
    noiseBuffer = makeNoise(ctx)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

// Autoplay: se o som já estava habilitado numa visita anterior, o contexto
// só desperta no primeiro gesto desta página (política dos navegadores).
if (typeof window !== 'undefined') {
  const wake = () => {
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  }
  window.addEventListener('pointerdown', wake)
  window.addEventListener('keydown', wake)
}

/** 0.2s de ruído branco: matéria-prima do prato do tada (sintetizado). */
function makeNoise(ac) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** Baixa e decodifica o sample uma única vez (cache na variável de módulo). */
async function loadDrumroll() {
  if (drumBuffer) return drumBuffer
  const res = await fetch(DRUMROLL_URL)
  if (!res.ok) throw new Error(`drumroll ${res.status}`)
  drumBuffer = await ctx.decodeAudioData(await res.arrayBuffer())
  return drumBuffer
}

/** Inicia o loop do sample com fade-in curto. */
export function startDrumroll() {
  if (!isSoundEnabled()) return
  const ac = ensureContext()
  if (!ac || drumSource) return // já rolando
  loadDrumroll()
    .then((buf) => {
      // Pode ter chegado stopDrumroll antes do download terminar.
      if (drumSource || !isSoundEnabled()) return
      const src = ac.createBufferSource()
      src.buffer = buf
      src.loop = true
      const g = ac.createGain()
      const t = ac.currentTime
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.9, t + 0.4) // entrada suave
      src.connect(g)
      g.connect(master)
      src.start(t)
      drumSource = src
      drumGain = g
    })
    .catch(() => {
      // Sample indisponível: cerimônia muda, gala continua.
    })
}

export function stopDrumroll() {
  if (drumSource) {
    const src = drumSource
    const g = drumGain
    const t = ctx.currentTime
    try {
      // Fade-out curtíssimo antes de parar: cortar seco tica o ouvido.
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
      src.stop(t + 0.2)
    } catch {
      src.stop()
    }
    drumSource = null
    drumGain = null
  }
}

/** Prato + thump grave: o "TADAM" do anúncio do vencedor (sintetizado). */
export function playRevealHit() {
  if (!isSoundEnabled()) return
  const ac = ensureContext()
  if (!ac) return
  const t = ac.currentTime

  // Prato: ruído em loop com highpass e decay longo (sibilância metálica).
  const cymbal = ctx.createBufferSource()
  cymbal.buffer = noiseBuffer
  cymbal.loop = true
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  const cg = ctx.createGain()
  cg.gain.setValueAtTime(0.55, t)
  cg.gain.exponentialRampToValueAtTime(0.001, t + 1.6)
  cymbal.connect(hp)
  hp.connect(cg)
  cg.connect(master)
  cymbal.start(t)
  cymbal.stop(t + 1.7)

  // Thump: seno grave caindo de 150Hz → 40Hz (o peito do tambor).
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.5)
  const og = ctx.createGain()
  og.gain.setValueAtTime(0.5, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
  osc.connect(og)
  og.connect(master)
  osc.start(t)
  osc.stop(t + 0.7)
}

/** Liga/desliga (botão da cerimônia). Retorna o novo estado. */
export function toggleSound() {
  const next = !isSoundEnabled()
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // localStorage bloqueado: a preferência só não persiste entre visitas.
  }
  if (next) ensureContext()
  else stopDrumroll()
  return next
}
