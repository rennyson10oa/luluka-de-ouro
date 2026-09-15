/**
 * mockAdmin — dados mock do Painel Soberano.
 * Substituir por /api/admin/* quando o backend FastAPI estiver pronto.
 */

export const MOCK_STATS = [
  {
    icon: 'groups',
    label: 'Eleitores Únicos',
    value: '1.482',
    detail: 'membros verificados',
  },
  {
    icon: 'fact_check',
    label: 'Votos Computados',
    value: '5.928',
    detail: 'em 4 categorias de gala',
  },
  {
    icon: 'pie_chart',
    label: 'Taxa de Engajamento',
    value: '94.8%',
    detail: 'do Discord',
  },
  {
    icon: 'swords',
    label: 'Mais Disputada',
    value: '👑 Mais Mitadas',
    detail: 'Margem mínima de 8.6%',
  },
]

export const MOCK_CATEGORIES = [
  {
    id: 'participacao-especial',
    emoji: '🎭',
    title: 'Melhor Participação Especial',
    reveal: 'Reveal #1',
    description: 'Aquele amigo que entra no call a cada 6 meses, fala uma frase épica e some',
    nominees: [
      {
        id: 'ind-041',
        name: 'Roberto Camargo',
        handle: '@BetoChave',
        pitch: 'Pagou R$ 450 num combo de uísque falso e jurou que era envelhecido no carvalho',
        icon: 'local_bar',
        votes: 1840,
      },
      {
        id: 'ind-042',
        name: 'Lucas Vasconcelos',
        handle: '@LuketaAudio',
        pitch: 'Mandou print da conversa de um grupo pro próprio grupo com legenda acusatória',
        icon: 'graphic_eq',
        votes: 1622,
      },
      {
        id: 'ind-043',
        name: 'Gabriel Santoro',
        handle: '@GabiMico',
        pitch: 'Errou o endereço do churrasco e passou 3 horas na festa de uma família desconhecida',
        icon: 'near_me_disabled',
        votes: 1411,
      },
      {
        id: 'ind-044',
        name: 'Matheus Silva',
        handle: '@TheusPicanha',
        pitch: 'Comprou curso de trade esportivo e perdeu a mesada inteira em escanteios da 3ª divisão',
        icon: 'calculate',
        votes: 1055,
      },
    ],
  },
  {
    id: 'mais-pataquadas',
    emoji: '🤡',
    title: 'Membro com Mais Pataquadas do Ano',
    reveal: 'Reveal #2 • Em Foco',
    description: 'Trajetórias marcadas por constrangimento de alto calibre e quedas metafóricas',
    nominees: [
      {
        id: 'ind-051',
        name: 'Roberto Camargo',
        handle: '@BetoChave',
        pitch: 'Jurou que sabia trocar o chuveiro sozinho. Alagou o prédio inteiro',
        icon: 'plumbing',
        votes: 980,
      },
      {
        id: 'ind-052',
        name: 'Pedro Henrique',
        handle: '@PedroZap',
        pitch: 'Respondeu "também te amo" pra mensagem de cobrança do dentista',
        icon: 'chat',
        votes: 1120,
      },
    ],
  },
  {
    id: 'mais-mitadas',
    emoji: '👑',
    title: 'Membro com Mais Mitadas',
    reveal: 'Reveal #3',
    description: 'Respostas milimétricas no grupo que provocaram silêncio constrangedor ou prints eternos',
    nominees: [
      {
        id: 'ind-061',
        name: 'Lucas Vasconcelos',
        handle: '@LuketaAudio',
        pitch: 'Respondeu o áudio de 8 minutos com um único "k" e derrubou o grupo',
        icon: 'graphic_eq',
        votes: 2100,
      },
    ],
  },
  {
    id: 'qi-temperatura-ambiente',
    emoji: '🌡️',
    title: 'Membro com QI de Temperatura Ambiente',
    reveal: 'Reveal #4',
    description: 'Pérolas científicas, teorias mirabolantes e dúvidas genuínas se o sol dorme à noite',
    nominees: [
      {
        id: 'ind-071',
        name: 'Matheus Silva',
        handle: '@TheusPicanha',
        pitch: 'Perguntou em pleno call se a Lua muda de lugar quando ninguém tá olhando',
        icon: 'nightlight',
        votes: 760,
      },
      {
        id: 'ind-072',
        name: 'Gabriel Santoro',
        handle: '@GabiMico',
        pitch: 'Achou que fuso horário era o fio que segura o relógio na parede',
        icon: 'schedule',
        votes: 640,
      },
    ],
  },
]

export const MOCK_AUDIT_LOG = [
  { id: 1, user: '@ReiDoZap', session: '[7f8a-c941]', time: 'Há 28 seg', votedIn: '👑 Mais Mitadas' },
  { id: 2, user: '@MestreDoSticker', session: '[3b19-e582]', time: 'Há 2 min', votedIn: '🎭 Participação Especial' },
  { id: 3, user: '@FiscalDeChurras', session: '[d044-88a2]', time: 'Há 4 min', votedIn: '🤡 Mais Pataquadas' },
  { id: 4, user: '@CavaleiroDaZoeira', session: '[092f-fa10]', time: 'Há 7 min', votedIn: '🌡️ QI Ambiente' },
  { id: 5, user: '@VovóDoGrupo', session: '[99aa-41b1]', time: 'Há 11 min', votedIn: '👑 Mais Mitadas' },
]

export const TOTAL_VOTES = 5928
