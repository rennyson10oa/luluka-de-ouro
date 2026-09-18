# ADR-0001 — AuthProvider reativo e Header persistente no layout

- **Status:** Aceito — **AuthProvider implementado** (2026-09-16, durante a verificação da Task 7: o estado fragmentado do `useAuth` fazia o perfil só atualizar após reload). **Header persistente no layout: pendente** (refatoração de layout, priorização futura).
- **Data:** 2026-09-14
- **Contexto de origem:** bug do tamanho alternado do `Trophy3DIcon` ao navegar entre rotas

---

## Contexto

Dois problemas, um sendo sintoma do outro:

### 1. Bug do troféu (corrigido — registrado como gotcha)

O `Trophy3DIcon` (ícone 3D do logo) exibia tamanho **alternado** a cada navegação:
correto na landing, gigante ao trocar de rota, correto de volta, e assim por diante.

**Causa raiz (padrão R3F + useGLTF):**

1. `useGLTF` cacheia a cena carregada — o **mesmo objeto** é retornado em todo mount;
2. `<primitive object={scene} scale={fit} position={offset}>` do R3F **muta** esse
   objeto cacheado (aplica as transforms nele);
3. No unmount, as transforms **permanecem** no objeto cacheado;
4. No mount seguinte, o auto-fit media `Box3.setFromObject(scene)` sobre a cena
   **já transformada** do mount anterior → `fit = 1.5/1.5 = 1` → troféu no tamanho
   nativo (gigante);
5. O ciclo repete: mount com cache limpo → correto (mas muta o cache); mount
   seguinte → incorreto (mas "reseta") → **alternância** a cada navegação.

**Correção aplicada:** clonar a cena por mount (`useMemo(() => scene.clone(), [scene])`).
O clone nasce com transform identity → medição determinística do bounding box e
cache do `useGLTF` intocado. Clone é raso (compartilha geometria) — custo de
memória zero. O hero (`Trophy3D`) nunca exibiu o bug porque usa `scale`/`position`
constantes, reaplicadas identicamente a cada mount.

> **Gotcha para o projeto:** sempre que um componente R3F receber uma cena de
> `useGLTF` e aplicar transforms dinâmicas (calculadas de medidas da própria
> cena), trabalhar sobre um **clone**. Nunca sobre a cena cacheada direto.

### 2. Causa estrutural (em aberto — este ADR)

O bug só se *manifesta por navegação* porque o Header — e o Canvas WebGL do
ícone — **remonta a cada troca de rota**: hoje cada página
(`LandingPage`, `LoginPage`, `RegisterPage`, `VotePage`) renderiza seu próprio
`<Header />`. Consequências:

- Context WebGL destruído/recriado a cada navegação (custo relevante em mobile,
  risco de context-loss em dispositivos limitados);
- Estado visual do ícone derivado de medidas "reinicia" a cada rota (permitiu o
  bug acima);
- Qualquer estado futuro no Header (ex.: dropdown do perfil) seria perdido ao
  navegar.

Além disso, o `useAuth` atual é um hook **não reativo**: lê `localStorage` uma
única vez no mount e mantém estado local por instância. Funciona hoje porque o
Header remonta a cada rota (relê o storage). Se o Header se tornar persistente,
o avatar ficaria **stale** após login/logout.

---

## Decisão proposta

Refatoração conjunta, como pré-requisito para a integração do backend (JWT):

### 1. `AuthProvider` — Context API para autenticação

- `src/context/AuthContext.jsx` com `AuthProvider` montado no `App.jsx`
  (dentro do `BrowserRouter`, fora de `Routes`);
- Estado único: `user`, `isAuthenticated`, `login`, `register`, `logout`
  (mesma API do hook atual, agora compartilhada);
- O hook `useAuth` passa a consumir o Context (`useContext(AuthContext)`);
- Persistência em `localStorage` permanece no provider (troca trivial por
  chamadas `/api/auth` + JWT quando o backend entrar);
- Com o backend real, o provider também fará restore de sessão via token.

### 2. Header persistente no layout

- `App.jsx` assume o chrome global:

```jsx
<BrowserRouter>
  <AuthProvider>
    <Header />          {/* remonta NUNCA */}
    <Routes>...</Routes>
    {/* Footer permanece por rota (FooterAuth vs Footer master) */}
  </AuthProvider>
</BrowserRouter>
```

- As 4 páginas removem o `<Header />` próprio e ajustam o padding do `main`
  (`pt-24` para compensar o header fixo);
- Footer **não** é persistido: `FooterAuth` (login/registro) vs `Footer` master
  (landing/votar) — a variação por contexto permanece por página.

### 3. Benefícios esperados

| Benefício | Efeito |
|-----------|--------|
| Context WebGL persiste | Sem churn de GPU por navegação; ícone 3D não reinicia |
| Classe de bugs eliminada | Estados derivados de mount não "derivam" mais entre rotas |
| Auth reativo | Avatar do Header atualiza ao vivo no login/logout (sem remount) |
| Caminho para JWT | `AuthProvider` é o ponto único de troca localStorage → API |
| Preparação para animações | Transições de rota (Framer Motion) exigem layout estável |

---

## Consequências / riscos

- **Esforço:** tocar em `App.jsx`, 4 páginas, `useAuth` (virar provider) —
  refatoração pequena, porém cross-cutting;
- **Risco baixo:** nenhuma mudança visual esperada; testar os 4 fluxos de
  navegação + login/logout após implementar;
- **Não fazer agora:** foi decisão consciente NÃO despachar esta refatoração no
  ciclo atual (MVP); implementar antes ou junto da integração do backend;
- O gotcha do clone (seção 1) já está aplicado no código e é independente
  desta refatoração.

---

## Alternativas consideradas

- **Menu hambúrguer + header por página:** não resolve o churn de context nem
  o estado stale; adia o problema;
- **`key` estável para o Canvas:** não impede o unmount do Header (o Canvas é
  filho da árvore da página);
- **Suspense/lazy no Canvas:** melhora first paint, mas não elimina o remount.
