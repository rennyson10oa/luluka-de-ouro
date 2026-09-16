/**
 * mockResults — dataset completo da Galeria de Resultados Oficiais (/resultados).
 *
 * Dados de pós-cerimônia, independentes do MOCK_CATEGORIES do painel admin
 * (a galeria tem vida própria: pódios, menções honrosas e estatísticas da
 * apuração). Substituir por /api/results quando o backend FastAPI estiver pronto.
 */

export const RESULTS_META = {
  edition: '2025',
  totalVotes: 1482,
  seal: 'Ata Notarial Homologada • Votação Encerrada',
}

export const GALLERY_STATS = [
  {
    icon: 'how_to_vote',
    label: 'Adesão Democrática',
    value: '1.482',
    detail: 'Votos auditados com reconhecimento facial de desocupados',
  },
  {
    icon: 'verified_user',
    label: 'Total de Urnas',
    value: '100%',
    detail: 'Seções de WhatsApp, Discord e Telegram apuradas',
  },
  {
    icon: 'military_tech',
    label: 'Troféus de Ouro',
    value: '4',
    detail: 'Estatuetas forjadas no fogo do sarcasmo implacável',
  },
  {
    icon: 'health_and_safety',
    label: 'Integridade Física',
    value: '0',
    detail: 'Admins feridos (apenas o orgulho de 14 membros destruído)',
  },
]

export const RESULT_CATEGORIES = [
  {
    id: 'participacao-especial',
    emoji: '🎭',
    badge: 'Prêmio Imprevisibilidade',
    title: 'Melhor Participação Especial',
    quote: 'Celebrando quem aparece menos que cometa em foto de grupo',
    navLabel: 'Participação Especial',
    validVotes: '1.482 Votos Válidos',
    podium: {
      first: {
        memeName: 'O Fantasma do Zap',
        realName: 'Hugo "O Oculto"',
        icon: 'visibility_off',
        pct: '36.5%',
        votes: '542 Votos',
        crimeLabel: 'O Crime Histórico:',
        crimeDetail: 'Eficiência de Presença: 0.04%',
        badge: 'Consagrado em Ata',
        audio: { name: 'silencio_8_meses.mp3', duration: '0:03', desc: 'Mensagem de voz após sumiço' },
        reactions: '124 REAÇÕES DE 😭',
      },
      second: {
        memeName: 'Primo do Interior',
        icon: 'account_circle',
        pct: '27.7%',
        votes: '410 votos computados',
        detail: 'Apareceu na gala inteira, sumiu no abraço final',
      },
      third: {
        memeName: 'O CLT Exausto',
        icon: 'bedtime',
        pct: '21.2%',
        votes: '315 votos computados',
        detail: 'Cansaço acumulado de 3 empregos e um plantão',
      },
      honorable: {
        memeName: 'Sumiço Tático',
        votes: '215 votos (14.6%)',
        detail: 'Saiu do grupo antes que cobrassem o rateio da pizza de domingo.',
      },
    },
  },
  {
    id: 'pataquadas',
    emoji: '🤡',
    badge: 'Prêmio Mico Cósmico',
    title: 'Membro com Mais Pataquadas do Ano',
    quote: 'Para quem transforma um almoço de domingo em tragédia nacional com audiência',
    navLabel: 'Pataquadas',
    validVotes: '1.482 Votos Válidos',
    podium: {
      first: {
        memeName: 'Print no Lugar Errado',
        realName: 'Bruno "O Desatento"',
        icon: 'sentiment_very_dissatisfied',
        pct: '46.0%',
        votes: '682 Votos',
        crimeLabel: 'O Crime Histórico:',
        crimeDetail: 'Dano de Imagem: Irrecuperável',
        badge: 'Maioria Absoluta',
        audio: { name: 'grito_discord_loss.mp3', duration: '0:14', desc: 'Áudio vazado da chamada' },
        reactions: '89 REAÇÕES DE ⚰️',
      },
      second: {
        memeName: 'Investidor de Shopee',
        icon: 'shopping_bag',
        pct: '31.0%',
        votes: '459 votos computados',
        detail: 'Prejuízo estimado: R$ 49,90 + 3x de vergonha',
      },
      third: {
        memeName: 'Waze Humano',
        icon: 'near_me_disabled',
        pct: '15.0%',
        votes: '222 votos computados',
        detail: 'Tempo perdido: 3h40min de pura raiva',
      },
      honorable: {
        memeName: 'O Quebra-Copos',
        votes: '119 votos (8.0%)',
        detail: 'Destruiu um copo de chopp de 30 reais na comemoração do próprio aniversário ao brindar forte demais.',
      },
    },
  },
  {
    id: 'mitadas',
    emoji: '👑',
    badge: 'Prêmio Elocuência Desmedida',
    title: 'Membro com Mais Mitadas',
    quote: 'Para réticas que calaram o grupo e viraram patrimônio histórico',
    navLabel: 'Mais Mitadas',
    validVotes: '1.482 Votos Válidos',
    podium: {
      first: {
        memeName: 'O Advogado do Diabo',
        realName: 'Matheus "O Jurista"',
        icon: 'gavel',
        pct: '41.3%',
        votes: '612 Votos',
        crimeLabel: 'O Crime Histórico:',
        crimeDetail: 'Disputa Mais Apertada: 8.6% de Margem',
        badge: 'Homologado',
        audio: { name: 'replica_relampago.mp3', duration: '0:07', desc: 'Resposta em velocidade da luz' },
        reactions: '67 REAÇÕES DE 🤡',
      },
      second: {
        memeName: 'Sticker Milimétrico',
        icon: 'sticker',
        pct: '32.7%',
        votes: '485 votos computados',
        detail: 'Precisão milimétrica: enviou no segundo exato',
      },
      third: {
        memeName: 'O Defensor Impossível',
        icon: 'shield',
        pct: '17.9%',
        votes: '265 votos computados',
        detail: 'Defendeu causa perdida e ainda agradeceu a plateia',
      },
      honorable: {
        memeName: 'O Mestre dos Acordes',
        votes: '120 votos (8.1%)',
        detail: 'Refutou uma briga política com uma paródia de voz e violão gravada na hora.',
      },
    },
  },
  {
    id: 'qi-ambiente',
    emoji: '🌡️',
    badge: 'Prêmio Raciocínio Tépido',
    title: 'Membro com QI de Temperatura Ambiente',
    quote: 'Honrando teorias que desafiaram a física, a geografia e o bom senso',
    navLabel: 'QI Ambiente',
    validVotes: '1.482 Votos Válidos',
    podium: {
      first: {
        memeName: 'Mestre da Geografia',
        realName: 'Gabriel "Sem Bússola"',
        icon: 'public',
        pct: '49.3%',
        votes: '730 Votos',
        crimeLabel: 'O Crime Histórico:',
        crimeDetail: 'Maior Lavada Eleitoral: 49.3%',
        badge: 'Quase 50% dos Votos',
        audio: { name: 'teoria_no_call.mp3', duration: '0:21', desc: 'Explicação científica ao vivo' },
        reactions: '203 REAÇÕES DE 💀',
      },
      second: {
        memeName: 'Teórico da Gravidade',
        icon: 'science',
        pct: '26.8%',
        votes: '398 votos computados',
        detail: 'Jura que a Terra é plana até no paredão',
      },
      third: {
        memeName: 'Calculadora Quebrada',
        icon: 'calculate',
        pct: '14.2%',
        votes: '210 votos computados',
        detail: 'Soma na mão: deu 47 numa conta de 2+2',
      },
      honorable: {
        memeName: 'Físico Quântico da Shopee',
        votes: '144 votos (9.7%)',
        detail: 'Tentou esquentar a água do miojo no micro-ondas usando papel alumínio para "manter o calor".',
      },
    },
  },
]

export const FUN_STATS = [
  {
    icon: 'schedule',
    label: 'Horário de Pico',
    value: 'Domingo • 23h48',
    detail: 'Quando o grupo deveria estar dormindo',
  },
  {
    icon: 'balance',
    label: 'A Mais Disputada',
    value: '41.3% vs 32.7%',
    detail: 'Foto finish da retórica',
  },
  {
    icon: 'waterfall_chart',
    label: 'Maior Lavada Eleitoral',
    value: 'Gabriel (Acre/Argentina)',
    detail: 'Quase 50% dos votos num só mandato',
  },
]