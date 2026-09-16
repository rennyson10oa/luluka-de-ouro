import { useNavigate } from 'react-router-dom'
import useAuth from './useAuth'

/**
 * useVoteNav — helper reutilizável que decide o destino do clique em
 * qualquer botão "Votar" do site.
 *
 * Se autenticado → /votar; senão → /login carregando o destino original
 * em location.state.from, para o LoginPage devolver o usuário ao /votar
 * após autenticar (padrão redirect-after-login).
 */
export default function useVoteNav() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  return () => {
    if (isAuthenticated) {
      navigate('/votar')
    } else {
      navigate('/login', { state: { from: '/votar' } })
    }
  }
}