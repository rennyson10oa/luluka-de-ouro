import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import useCandidacies from '../hooks/useCandidacies'
import Header from '../components/Header'
import { Footer } from '../components/Footer'
import CandidacyCard from '../components/candidacy/CandidacyCard'
import CandidacyModal from '../components/candidacy/CandidacyModal'

/**
 * Chequeo síncrono de sesión. useAuth hidrata de forma asíncrona (useEffect),
 * así que en el 1er render tras navegar desde /login el estado aún es null.
 * Sin este chequeo, un usuario logueado recibiría un redirect falso a /login.
 */
function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem('pg_user'))
  } catch {
    return false
  }
}

/**
 * CandidacyPage — Urna de Candidaturas (/candidaturas).
 * Guard idéntico al VotePage. Store compartido (pg_candidacies) con el perfil.
 * Tudo mock: candidaturas persistem em localStorage e as categorias vêm de
 * MOCK_CATEGORIES (fonte única, nunca mutada — ADR-0001).
 */
export default function CandidacyPage() {
  const { isAuthenticated, user } = useAuth()
  const {
    candidacies,
    maxCandidacies,
    usedCount,
    remaining,
    openCategories,
    addCandidacy,
    updatePitch,
    isClosed,
    shareText,
  } = useCandidacies()

  const [toast, setToast] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCategory, setModalCategory] = useState(null)
  const [modalEditing, setModalEditing] = useState(null)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  // ---- Guard de auth ----
  if (!isAuthenticated) {
    if (!hasStoredSession()) {
      return <Navigate to="/login" replace state={{ from: '/candidaturas' }} />
    }
    // Sesión guardada pero useAuth aún hidratando (1er render tras navegación).
    return (
      <div className="min-h-screen flex flex-col bg-surface text-on-surface">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-28">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[32px] animate-spin">progress_activity</span>
            <span className="font-sans text-body-sm text-on-surface-variant">Verificando credenciais notariais...</span>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  function openCreate(category) {
    setModalCategory(category)
    setModalEditing(null)
    setModalOpen(true)
  }

  function openEdit(candidacy) {
    setModalEditing(candidacy)
    setModalCategory(null)
    setModalOpen(true)
  }

  function handleShare(candidacy) {
    const text = shareText(candidacy)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast('Pitch copiado — manda no Zap!'))
        .catch(() => showToast('Não consegui copiar sozinho, copia na mão aí'))
    } else {
      showToast('Seu navegador não suporta cópia automática')
    }
  }

  function handleSubmit(pitch) {
    if (modalEditing) {
      const res = updatePitch(modalEditing.id, pitch)
      if (res.success) showToast('Pitch retificado com sucesso!')
      return res
    }
    if (modalCategory) {
      const res = addCandidacy(modalCategory, pitch)
      if (res.success) showToast('Candidatura registrada! Boa sorte na disputa')
      return res
    }
    return { success: false, error: 'Nenhuma categoria selecionada' }
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-12 pt-28 pb-24 relative isolate">
        {/* Blobs dourados sutis de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-primary/10 blur-[130px] rounded-full" />
          <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-tertiary-container/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-10 left-[-5%] w-[450px] h-[450px] bg-primary-container/10 blur-[140px] rounded-full" />
        </div>

        <div className="flex flex-col gap-8 relative z-10">
          {/* ---- Hero notarial ---- */}
          <section className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-surface-container-high/90 shadow-[0_0_16px_rgba(212,175,55,0.2)] mb-4 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span className="font-label-sm text-label-sm text-primary tracking-[0.2em] uppercase">Protocolo de Auto-Indicação • Temporada 2025</span>
              <span className="material-symbols-outlined text-primary text-[14px]">verified</span>
            </div>

            <h1 className="font-serif font-bold text-headline-lg text-primary tracking-tight leading-none mb-2 drop-shadow-[0_4px_24px_rgba(212,175,55,0.3)]">
              🏛️ Urna de <span className="gold-gradient-text">Candidaturas</span>
            </h1>

            <p className="font-sans text-body-md text-on-surface-variant max-w-2xl font-light leading-relaxed">
              Concorra aos troféus oficiais — ou convença o grupo soberano do porquê você merece a vergonha imortal ou a glória eterna.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm font-bold">
              <span className="material-symbols-outlined text-[16px]">how_to_vote</span>
              {usedCount}/{maxCandidacies} Ativas
            </div>

            {/* Aviso do Tribunal */}
            <div className="mt-6 w-full max-w-2xl px-4 py-2 rounded-xl bg-surface-container-lowest/80 backdrop-blur-md shadow-md flex items-center justify-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0">gavel</span>
              <p className="font-sans text-body-sm text-on-surface-variant text-center">
                <strong className="text-primary font-semibold">Aviso do Tribunal:</strong> Toda autodeclaração será submetida ao deboche público imediato. Pense duas vezes antes de apelar.
              </p>
            </div>
          </section>

          {/* ---- Banners de estado ---- */}
          {isClosed && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/40">
              <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
              <p className="font-sans text-body-sm text-on-surface-variant">
                As urnas se fecharam — campanhas seladas para a cerimônia.
              </p>
            </div>
          )}
          {!isClosed && remaining === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-lowest/80 backdrop-blur-md border border-primary-container/30">
              <span className="material-symbols-outlined text-primary text-[20px]">done_all</span>
              <p className="font-sans text-body-sm text-on-surface-variant">
                Todas as {maxCandidacies} submissões utilizadas — dossiê completo.
              </p>
            </div>
          )}

          {/* ---- Minhas Candidaturas Registradas ---- */}
          <section className="w-full">
            <div className="w-full rounded-2xl bg-surface-container-low/70 backdrop-blur-xl p-5 lg:p-6 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6),0_0_24px_0_rgba(212,175,55,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">how_to_reg</span>
                  <h2 className="font-sans font-bold text-title-md text-on-surface tracking-wide">Minhas Candidaturas Registradas</h2>
                  <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm">
                    {usedCount}/{maxCandidacies} Ativas
                  </span>
                </div>
                <p className="font-sans text-body-sm text-outline">
                  Dossiê oficial de <span className="text-primary font-semibold">@{user?.username}</span> perante a comissão julgadora.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {candidacies.length === 0 ? (
                <div className="rounded-2xl bg-surface-container-low/60 backdrop-blur-xl p-8 text-center">
                  <p className="font-sans text-body-md text-on-surface-variant">
                    Nenhuma candidatura registrada ainda. As vagas abertas estão logo abaixo — bora se candidatar! 🕳️
                  </p>
                </div>
              ) : (
                candidacies.map((c) => (
                  <CandidacyCard
                    key={c.id}
                    candidacy={c}
                    isClosed={isClosed}
                    onEdit={openEdit}
                    onShare={handleShare}
                  />
                ))
              )}
            </div>
          </section>

          {/* ---- Vagas Abertas ---- */}
          {!isClosed && openCategories.length > 0 && (
            <section className="w-full">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
                <h2 className="font-sans font-bold text-title-md text-on-surface tracking-wide">Vagas Abertas</h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  {openCategories.length} disponíveis
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                {openCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="relative rounded-2xl bg-surface-container-low/75 backdrop-blur-xl p-5 shadow-lg flex flex-col justify-between transition-all duration-300 hover:shadow-[0_16px_40px_-4px_rgba(0,0,0,0.8),0_0_24px_0_rgba(212,175,55,0.15)] group"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center text-3xl group-hover:scale-105 transition-transform shrink-0">
                            {cat.emoji}
                          </div>
                          <div>
                            <h3 className="font-serif font-bold text-headline-sm text-on-surface leading-tight">{cat.title}</h3>
                            <p className="font-sans text-body-sm text-outline mt-0.5">{cat.description}</p>
                          </div>
                        </div>
                        <span className="shrink-0 px-3 py-1 rounded-full bg-surface-container-high text-outline font-label-sm text-label-sm flex items-center gap-1">
                          Vaga aberta 🕳️
                        </span>
                      </div>

                      <div className="my-4 rounded-xl bg-surface-container/40 p-4 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-2 text-secondary">
                          <span className="material-symbols-outlined text-[24px]">theater_comedy</span>
                        </div>
                        <p className="font-sans font-semibold text-title-md text-on-surface mb-1">Você é o cometa lendário do chat?</p>
                        <p className="font-sans text-body-sm text-outline max-w-sm">
                          Lance sua candidatura oficial com um pitch irrefutável e garanta seu lugar no tapete vermelho.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreate(cat)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-fixed via-primary to-primary-container text-on-primary font-sans font-bold text-body-md transition-all duration-300 shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:shadow-[0_0_32px_rgba(212,175,55,0.55)] hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <span>Candidatar-se ao Troféu</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---- Rodapé notarial da sessão ---- */}
          <section className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest/60 backdrop-blur-sm text-outline font-sans text-body-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
              <span>Sessão Notarial Criptografada • Protocolo Oficial de Votações 2025</span>
            </div>
            <div className="flex items-center gap-4 text-secondary font-medium">
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">menu_book</span> Regimento do Deboche
              </a>
              <span className="opacity-30">•</span>
              <a href="#" className="hover:text-primary transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">support_agent</span> Chamar Juiz de Paz
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />

      {/* ---- Modal de candidatura ---- */}
      <CandidacyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        category={modalCategory}
        editing={modalEditing}
        onSubmit={handleSubmit}
      />

      {/* ---- Toast ---- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-highest/95 backdrop-blur-xl px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-primary-container/30">
          <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
          <span className="font-sans text-body-md text-on-surface">{toast}</span>
        </div>
      )}
    </div>
  )
}