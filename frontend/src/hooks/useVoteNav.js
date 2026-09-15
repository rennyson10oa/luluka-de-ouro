import { useNavigate } from 'react-router-dom'
import useAuth from './useAuth'

/**
 * useVoteNav — helper reutilizável que decide o destino do clique em
 * qualquer botão "Votar" do site.
 *
 * Se autenticado → /votar; senão → /login.
 */
export default function useVoteNav() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  return () => navigate(isAuthenticated ? '/votar' : '/login')
}