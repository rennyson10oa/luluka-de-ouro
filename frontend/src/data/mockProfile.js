/**
 * mockProfile — datos mock das seções não-backend do Perfil do Usuario.
 * Honrarias, candidaturas próprias e atividade recente são cenográficas
 * até que o backend exponga esses endpoints (próxima sprint).
 */

export const MOCK_HONORS = [
  {
    icon: 'military_tech',
    title: 'Honraria Notarial',
    tier: 'Ouro',
    desc: 'Condecorado pela conduta exemplar na ata',
  },
  {
    icon: 'workspace_premium',
    title: 'Troféu Suspenso',
    tier: 'Prata',
    desc: 'Aguardando a cerimônia de reveal',
  },
  {
    icon: 'devices',
    title: 'Dispositivo Autenticado',
    tier: '#401-BR',
    desc: 'Sessão segura ativa neste dispositivo',
  },
]

export const MOCK_MY_CANDIDACIES = [
  {
    protocol: '#MIT-2025-09',
    category: 'Membro com Mais Mitadas',
    emoji: '⚡',
    pitch: 'Resposta cirúrgica que calou o grupo por 20 segundos',
    status: 'Homologada',
  },
  {
    protocol: '#PAT-2025-14',
    category: 'Mais Pataquadas do Ano',
    emoji: '🤡',
    pitch: 'Combo de uísque falso narrado com orgulho',
    status: 'Homologada',
  },
]

export const MOCK_ACTIVITY = [
  {
    period: 'Hoje',
    items: [
      { icon: 'how_to_vote', text: 'Voto computado em', detail: 'Membro com Mais Mitadas', time: 'Há 2 horas' },
      { icon: 'edit_note', text: 'Pitch retificado para o protocolo', detail: '#MIT-2025-09', time: 'Há 5 horas' },
      { icon: 'verified', text: 'Certificado de Quitação Eleitoral 2025 emitido', time: 'Há 8 horas' },
    ],
  },
  {
    period: 'Ontem',
    items: [
      { icon: 'how_to_vote', text: 'Voto computado em', detail: 'Melhor Participação Especial', time: '22:41' },
    ],
  },
]

/** Teto de candidaturas por usuário nesta edição da gala. */
export const MAX_CANDIDACIES = 4