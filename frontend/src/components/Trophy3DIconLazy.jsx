import { Suspense, lazy } from 'react';

// Ícone 3D carregado sob demanda: o Header vive em TODAS as páginas, e sem
// este lazy o three.js inteiro (~700 KB minificado) entrava no chunk
// principal e era baixado/parseado até na tela de login. Com o lazy, o
// chunk do three vira um fetch assíncrono separado que não trava a
// primeira pintura de nenhuma rota.
const Trophy3DIcon = lazy(() => import('./Trophy3DIcon'));

function StaticTrophyFallback({ width = 40, height = 40 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="#d4af37"
      aria-label="Troféu Prêmios do Grupo"
      style={{ margin: 'auto' }}
    >
      <path d="M5 3h14v2h2a2 2 0 0 1 2 2c0 2.8-2 5-4.6 5.4A6 6 0 0 1 13 15.9V18h3a1 1 0 0 1 1 1v2H7v-2a1 1 0 0 1 1-1h3v-2.1A6 6 0 0 1 5.6 12.4C3 12 1 9.8 1 7a2 2 0 0 1 2-2h2V3zm0 4H3c0 1.8 1.2 3.2 2.9 3.5A9 9 0 0 1 5 7zm14 0c0 1.2-.3 2.4-.9 3.5C19.8 10.2 21 8.8 21 7h-2z" />
    </svg>
  );
}

export default function Trophy3DIconLazy(props) {
  return (
    <Suspense fallback={<StaticTrophyFallback width={props.width} height={props.height} />}>
      <Trophy3DIcon {...props} />
    </Suspense>
  );
}
