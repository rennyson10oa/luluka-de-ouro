# 07 - Checklist de Aceite

Utilize esta lista para validar a entrega final. A aplicação deve passar por todos estes fluxos de ponta a ponta:

## Autenticação e Conta
- [ ] O usuário consegue se cadastrar fornecendo apenas Username e Senha.
- [ ] Não é permitido cadastrar Usernames duplicados.
- [ ] O login funciona e a sessão persiste corretamente (JWT guardado).

## Candidaturas
- [ ] O usuário logado consegue visualizar as categorias na urna de candidatura.
- [ ] O usuário consegue adicionar um pitch para se candidatar (limite max: 280 caracteres).
- [ ] O sistema não permite que um usuário faça mais de uma candidatura na mesma categoria.
- [ ] O usuário pode editar seu próprio pitch enquanto a votação estiver aberta.

## Votação e Regras
- [ ] Tela de votação é funcional, avançando uma categoria por vez (stepper).
- [ ] **Restrição de Auto-voto:** No front, tentar votar em si mesmo exibe mensagem humorística "voto não permitido 😜".
- [ ] **Restrição de Auto-voto:** Backend rejeita com erro 403.
- [ ] O voto pode ser alterado (upsert) se realizado repetidas vezes.

## Timer e Bloqueio
- [ ] O frontend exibe timer sincronizado e dependente do `reveal_at` que vem do backend.
- [ ] Ao fechar votação (timer ou painel admin), botões de votar/candidatar devem sumir/desabilitar.
- [ ] O acesso à `/api/results` deve responder `403` se a votação não estiver devidamente fechada/revelada.

## Cerimônia e Interface
- [ ] O layout funciona perfeitamente (sem barra de rolagem horizontal indevida) em telas de 360px (mobile-first).
- [ ] Estilo "Glassmorphism" escuro com bordas e destaques em dourado conforme paleta.
- [ ] A cerimônia do Reveal (/reveal) revela 3º, 2º e 1º lugares sequencialmente.
- [ ] O evento de 1º lugar exibe o *pitch* vencedor e possui um efeito (*drum roll* por 1,5s e confete virtual).
- [ ] Ocorrências de Empate no topo mostram banner/estado visual de "EMPATE HISTÓRICO ⚖️".
- [ ] Modelo 3D na Landing page carrega corretamente e exibe textura de placeholder (se asset final não substituído).

## Admin
- [ ] Logando com a senha de admin (env var), é possível acessar o dashboard.
- [ ] Admin consegue candidatar usuários, criar novas categorias e interromper a votação (forçar reveal).
