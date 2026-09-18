/**
 * userScope — escopo de storage por usuário para os stores mock.
 *
 * O localStorage é global no browser: sem escopo, os dados de um eleitor
 * vazam para o próximo (bug reportado na verificação — selar votos com o
 * usuário A e o usuário B herdar a cédula selada).
 *
 * Escopo por user.id (estável — sobrevive à troca de @handle, que re-emite
 * a sessão). Sem id (sessão ainda hidratando), retorna 'anon' — chave que
 * nunca contém dados, evitando flash do estado errado até o useAuth hidratar.
 *
 * Chaves globais de propósito (NÃO escopar): pg_reveal_at (configuração da
 * gala, definida pelo admin) e pg_token/pg_user (sessão ativa).
 */

/** Retorna o sufixo de escopo do usuário: 'u<id>' ou 'anon'. */
export function userScope(user) {
  const id = user?.id
  return Number.isInteger(id) ? `u${id}` : 'anon'
}

/** Chave de storage com escopo do usuário: '<base>:<escopo>'. */
export function scopedKey(base, user) {
  return `${base}:${userScope(user)}`
}
