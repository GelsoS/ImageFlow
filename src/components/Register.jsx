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

      // Redirecionar para login após registro bem-sucedido
      setView("login")
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-form-container">
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
    </div>
  )
}

export default Register
