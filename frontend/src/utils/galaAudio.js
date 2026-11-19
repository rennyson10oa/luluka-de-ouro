/**
 * galaAudio — motor de som da cerimônia (Web Audio API, ZERO assets).
 *
 * Filosofia do ProceduralEnv: nada de baixar mp3/HDR — o drumroll (cacla
 * de caixa com crescendo) e o "bum" da revelação são SINTETIZADOS em
 * runtime com ruído branco + filtros. Sem arquivo, sem CDN, sem licença.
 *
 * Políticas de autoplay dos navegadores: o AudioContext só desperta num
 * GESTO do usuário — por isso o som é opt-in (botão na barra da cerimônia
 * dirigida) e a preferência persiste em localStorage. Se o som já estava
 * ativo numa visita anterior, o contexto acorda no 1º toque/tecla da página.
 *
 * Uso: RevealPage orquestra startDrumroll/stopDrumroll/playRevealHit
 * conforme a fase da cerimônia; o toggle chama toggleSound().
 */

let ctx = null
let master = null
let noiseBuffer = null
let drumTimer = null

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

/** 0.2s de ruído branco: a matéria-prima da caixa e do prato. */
function makeNoise(ac) {
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.2), ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/** Uma batida de caixa: rajada de ruído filtrada, decay curtíssimo. */
function snare(when, gainValue) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuffer
  const band = ctx.createBiquadFilter()
  band.type = 'bandpass'
  // Jitter de afinação: bateria real não é um sample loop congelado.
  band.frequency.value = 1500 + Math.random() * 700
  band.Q.value = 0.8
  const g = ctx.createGain()
  g.gain.setValueAtTime(gainValue, when)
  g.gain.exponentialRampToValueAtTime(0.001, when + 0.09)
  src.connect(band)
  band.connect(g)
  g.connect(master)
  src.start(when)
  src.stop(when + 0.1)
}

/** Inicia a cacla contínua de drumroll (com crescendo suave). */
export function startDrumroll() {
  if (!isSoundEnabled()) return
  const ac = ensureContext()
  if (!ac || drumTimer) return // já rolando
  const t0 = ac.currentTime
  drumTimer = setInterval(() => {
    // Crescendo: cada batida um pouco mais forte conforme o suspense dura.
    const elapsed = ac.currentTime - t0
    const volume = Math.min(0.45, 0.1 + elapsed * 0.06)
    snare(ac.currentTime, volume)
  }, 55) // ~18 batidas/s: tensão de novela das oito
}

export function stopDrumroll() {
  if (drumTimer) {
    clearInterval(drumTimer)
    drumTimer = null
  }
}

/** Prato + thump grave: o "TADAM" do anúncio do vencedor. */
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
