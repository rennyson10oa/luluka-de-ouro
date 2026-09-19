import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

/**
 * ConfettiCanvas — chuva de confete em canvas puro (zero dependências).
 *
 * Partículas nascem no topo em "bursts" e caem com gravidade, rotação e fade.
 * O loop de render para quando não há partículas vivas (economia de bateria).
 *
 * API: ref.fire(count) dispara um burst. Renderiza fixo sobre a página,
 * sem capturar eventos (pointer-events-none).
 */

const COLORS = ['#d4af37', '#f2ca50', '#ffe088', '#f5e7a8', '#ffffff', '#8c7326']

const ConfettiCanvas = forwardRef(function ConfettiCanvas(props, ref) {
  const canvasRef = useRef(null)
  // Estado mutável fora do React (loop de animação não deve re-renderizar)
  const particles = useRef([])
  const rafId = useRef(null)

  /**
   * Ajusta o canvas à viewport com devicePixelRatio. Chamado no mount e
   * ANTES de cada burst: sem isso, o primeiro burst distribui partículas
   * no canvas default de ~300px — aparecendo agrupadas à esquerda até o
   * primeiro resize (bug reportado no ensaio da Task 11).
   */
  function resize() {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  useImperativeHandle(ref, () => ({
    /** Dispara um burst de confete (padrão: 120 partículas). */
    fire(count = 120) {
      const canvas = canvasRef.current
      if (!canvas) return
      resize() // protege contra canvas default e mudanças de layout
      const w = window.innerWidth
      for (let i = 0; i < count; i++) {
        particles.current.push({
          x: Math.random() * w,
          y: -20 - Math.random() * 80,
          w: 6 + Math.random() * 6,
          h: 8 + Math.random() * 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          vy: 2 + Math.random() * 3,
          vx: (Math.random() - 0.5) * 1.5,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.2,
          opacity: 1,
        })
      }
      startLoop()
    },
  }))

  function startLoop() {
    if (rafId.current !== null) return // loop já rodando
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function tick() {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      const alive = []
      for (const p of particles.current) {
        p.y += p.vy
        p.x += p.vx + Math.sin(p.y * 0.02) * 0.4 // balanço lateral
        p.rot += p.vr
        if (p.y > window.innerHeight * 0.7) p.opacity -= 0.015
        if (p.opacity <= 0 || p.y > window.innerHeight + 20) continue
        alive.push(p)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
      particles.current = alive

      if (alive.length > 0) {
        rafId.current = requestAnimationFrame(tick)
      } else {
        // Sem partículas vivas: encerra o loop (economia de recursos)
        rafId.current = null
      }
    }
    rafId.current = requestAnimationFrame(tick)
  }

  // Resize no mount + listener contínuo; limpeza completa no unmount.
  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafId.current !== null) cancelAnimationFrame(rafId.current)
      particles.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      aria-hidden="true"
    />
  )
})

export default ConfettiCanvas
