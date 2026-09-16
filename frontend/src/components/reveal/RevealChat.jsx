import { useEffect, useRef, useState } from 'react'

/**
 * RevealChat — chat ao vivo mockado da cerimônia.
 *
 * Quando ativo, injeta mensagens do pool em intervalos (ciclando),
 * com cap de 8 visíveis. Cleanup rigoroso dos timers.
 */

const MESSAGE_POOL = [
  { user: '@Davi_M', text: 'KKKKKKK MERECE DEMAIS! O print virou patrimônio histórico' },
  { user: '@Marcos_Real', text: 'EU TAVA LÁ NO DIA DO PRINT! O chefe ainda posta indireta kkkkk' },
  { user: '@Gabi_Design', text: 'Coitado do Bruno bicho, a cara dele quando viu o que fez 😭💀' },
  { user: '@VovoDoGrupo', text: 'Na minha época isso aí era sumiço da NASA, respeitem os clássicos' },
  { user: '@FiscalDoChurras', text: 'Requerimento de revisão da ata: eu presenciei, é verídico' },
  { user: '@LuketaAudio', text: 'áudio de 8 minutos explicando por que mereço o troféu, ESCUTEM' },
  { user: '@BetoChave', text: 'gente eu juro que o uísque era envelhecido no carvalho 😤' },
  { user: '@TheusPicanha', text: 'se a Lua muda de lugar quando ninguém tá olhando, meu voto também muda' },
  { user: '@ReiDoZap', text: 'apuração mais justa que a do Ballon dOr, SEM CONVERSAR' },
  { user: '@MestreDoSticker', text: 'sticker do momento exato já em produção, patrimônio imortal' },
]

export default function RevealChat({ active }) {
  const [messages, setMessages] = useState(() => MESSAGE_POOL.slice(0, 3))
  const poolIndex = useRef(3)

  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => {
      setMessages((prev) => {
        const next = [...prev, MESSAGE_POOL[poolIndex.current % MESSAGE_POOL.length]]
        poolIndex.current += 1
        // Cap de 8 visíveis: as mais antigas saem
        return next.slice(-8)
      })
    }, 4000)
    return () => clearInterval(id)
  }, [active])

  return (
    <div className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-2xl p-4 border border-outline-variant/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-sans font-bold text-label-sm text-secondary uppercase tracking-widest">
          Atualizando em tempo real
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {messages.map((msg, i) => (
          <li
            key={`${msg.user}-${i}`}
            className="p-2.5 rounded-lg bg-surface-container-low/70 transition-opacity duration-500"
            style={{ opacity: i === messages.length - 1 ? 1 : 0.75 }}
          >
            <span className="font-sans font-semibold text-body-sm text-secondary">{msg.user}: </span>
            <span className="font-sans text-body-sm text-on-surface-variant">{msg.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
