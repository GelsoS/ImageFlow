"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/Auth.css"

function Register({ setView }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Adicionar um novo estado para controlar a exibição da confirmação de email
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")

  // Modificar a função handleRegister para mostrar a confirmação em vez de redirecionar
  const handleRegister = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)

      // Registrar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
        },
      })

      if (authError) throw authError

      // Criar perfil do usuário
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: authData.user.id,
            username,
            email,
            role: "user", // Por padrão, todos os novos usuários são 'user'
          },
        ])

        if (profileError) throw profileError
      }

      // Mostrar confirmação de email em vez de redirecionar para login
      setRegisteredEmail(email)
      setShowEmailConfirmation(true)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Substituir o return do componente para incluir a confirmação de email quando necessário
  return (
    <div className="auth-form-container">
      {!showEmailConfirmation ? (
        <>
          <h2>Criar Conta</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Nome de Usuário</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Escolha um nome de usuário"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Crie uma senha segura"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <div className="contact-info">
            <div className="contact-divider">
              <span>Precisa de ajuda?</span>
            </div>
            <div className="whatsapp-contact">
              <span className="whatsapp-icon">📱</span>
              <div className="contact-details">
                <strong>Gelso Schwertz</strong>
                <a
                  href="https://wa.me/5549991765460"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-link"
                >
                  (49) 99176-5460
                </a>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="email-confirmation">
          <div className="email-icon">✉️</div>
          <h2>Verifique seu Email</h2>
          <p>
            Enviamos um link de confirmação para <strong>{registeredEmail}</strong>
          </p>
          <p>Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.</p>
          <div className="confirmation-actions">
            <button onClick={() => setView("login")} className="login-redirect-btn">
              Ir para Login
            </button>
            <button onClick={() => window.location.reload()} className="resend-btn">
              Não recebeu? Tente novamente
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Register
