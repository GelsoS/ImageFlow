"use client"

import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import "./App.css"
import Login from "./components/Login"
import Register from "./components/Register"
import AdminDashboard from "./components/AdminDashboard"
import UserDashboard from "./components/UserDashboard"

function App() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState("login")

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Configurar listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(userId) {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        throw error
      }

      setUser(data)
    } catch (error) {
      console.error("Erro ao buscar perfil:", error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    //window.location.reload()
  }

  if (loading) {
    return <div className="loading">Carregando...</div>
  }

  if (!session) {
    return (
      <div className="auth-container">
        {view === "login" ? (
          <>
            <Login setView={setView} />
            <p className="auth-switch">
              Não tem uma conta? <button onClick={() => setView("register")}>Criar conta</button>
            </p>
          </>
        ) : (
          <>
            <Register setView={setView} />
            <p className="auth-switch">
              Já tem uma conta? <button onClick={() => setView("login")}>Entrar</button>
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Gerenciador de Imagens</h1>
        <div className="user-info">
          <span>Olá, {user?.username || session.user.email}</span>
          <button onClick={handleLogout} className="logout-btn">
            Sair
          </button>
        </div>
      </header>

      <main className="app-main">
        {user?.role === "admin" ? <AdminDashboard user={user} /> : <UserDashboard user={user} />}
      </main>
    </div>
  )
}

export default App
