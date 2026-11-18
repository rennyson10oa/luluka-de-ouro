/**
 * isLowPower — detecção única de dispositivo fraco (celular/tablet).
 *
 * Usada para degradar os canvas WebGL SEM afetar o desktop:
 *   - dpr mais baixo (celular renderiza em até 3x de pixel-ratio: é o
 *     maior assassino de FPS em telas cheias);
 *   - antialias desligado (a economia de fill-rate é grande, o custo
 *     visual em telas pequenas é quase nulo);
 *   - menos partículas no hero.
 *
 * 'pointer: coarse' pega telas de toque; a largura cobre desktops pequenos.
 * Avaliado UMA vez (const de módulo) — ninguém troca de celular no meio da gala.
 */
export const isLowPower =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 767px)').matches)
