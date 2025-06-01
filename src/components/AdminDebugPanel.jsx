"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/AdminDebugPanel.css"

function AdminDebugPanel({ user }) {
  const [paymentId, setPaymentId] = useState("113535423120")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function activateSubscriptionDirect() {
    if (!paymentId.trim()) {
      alert("Digite o ID do pagamento")
      return
    }

    if (!confirm("Tem certeza que deseja ativar a assinatura premium?")) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log("=== Iniciando ativação direta da assinatura ===")
      console.log("User ID:", user.id)
      console.log("Payment ID:", paymentId.trim())

      // Verificar se já existe assinatura para este pagamento
      console.log("Verificando assinatura existente...")
      const { data: existingSubscription, error: checkError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("payment_id", paymentId.trim())
        .maybeSingle()

      if (checkError) {
        console.error("Erro ao verificar assinatura:", checkError)
        throw new Error("Erro ao verificar assinatura: " + checkError.message)
      }

      console.log("Assinatura existente:", existingSubscription)

      let subscriptionData = existingSubscription

      if (!existingSubscription) {
        // Criar nova assinatura
        console.log("Criando nova assinatura...")
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        const newSubscriptionData = {
          user_id: user.id,
          plan_type: "premium",
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: "pix",
          payment_id: paymentId.trim(),
          amount: 9.9,
          currency: "BRL",
        }

        console.log("Dados da nova assinatura:", newSubscriptionData)

        const { data: newSubscription, error: subscriptionError } = await supabase
          .from("subscriptions")
          .insert([newSubscriptionData])
          .select()
          .single()

        if (subscriptionError) {
          console.error("Erro ao criar assinatura:", subscriptionError)
          throw new Error("Erro ao criar assinatura: " + subscriptionError.message)
        }

        console.log("Nova assinatura criada:", newSubscription)
        subscriptionData = newSubscription
      }

      // Atualizar perfil do usuário para admin
      console.log("Atualizando perfil do usuário...")
      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          subscription_status: "premium",
          subscription_end_date: subscriptionData.end_date,
        })
        .eq("id", user.id)
        .select()
        .single()

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError)
        throw new Error("Erro ao atualizar perfil: " + profileError.message)
      }

      console.log("Perfil atualizado:", updatedProfile)
      console.log("=== Ativação concluída com sucesso ===")

      setResult({
        success: true,
        message: "🎉 Assinatura Premium ativada com sucesso!",
        subscription: subscriptionData,
        profile: updatedProfile,
        nextSteps: "Recarregue a página para ver as mudanças",
      })

      // Mostrar mensagem de sucesso
      alert("🎉 Assinatura Premium ativada com sucesso!\n\nRecarregue a página para acessar todos os recursos.")

      // Recarregar automaticamente após 3 segundos
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error("Erro na ativação:", error)
      setResult({
        success: false,
        error: error.message,
        details: error,
      })
    } finally {
      setLoading(false)
    }
  }

  async function checkCurrentStatus() {
    try {
      console.log("Verificando status atual...")

      // Verificar perfil atual
      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw new Error("Erro ao verificar perfil: " + profileError.message)
      }

      // Verificar assinaturas
      const { data: subscriptions, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (subError) {
        throw new Error("Erro ao verificar assinaturas: " + subError.message)
      }

      setResult({
        success: true,
        message: "Status atual verificado",
        currentProfile: currentProfile,
        subscriptions: subscriptions,
      })
    } catch (error) {
      setResult({
        success: false,
        error: error.message,
      })
    }
  }

  return (
    <div className="debug-panel">
      <h3>🔧 Ativação Manual de Assinatura Premium</h3>

      <div className="debug-section">
        <h4>✅ Ativar Sua Assinatura</h4>
        <p>
          <strong>Seu pagamento PIX foi identificado!</strong>
        </p>
        <p>Clique no botão abaixo para ativar sua assinatura premium imediatamente:</p>

        <div className="payment-check">
          <input
            type="text"
            value={paymentId}
            onChange={(e) => setPaymentId(e.target.value)}
            placeholder="ID do Pagamento"
            className="payment-input"
            disabled={loading}
          />
          <button onClick={activateSubscriptionDirect} disabled={loading} className="process-btn">
            {loading ? "🔄 Ativando..." : "🚀 Ativar Premium"}
          </button>
        </div>

        <div className="status-check">
          <button onClick={checkCurrentStatus} className="status-btn">
            📊 Verificar Status Atual
          </button>
        </div>

        <div className="payment-info">
          <h5>📋 Informações do Pagamento:</h5>
          <ul>
            <li>
              <strong>ID do Pagamento:</strong> 113535423120
            </li>
            <li>
              <strong>Valor:</strong> R$ 9,90
            </li>
            <li>
              <strong>Método:</strong> PIX
            </li>
            <li>
              <strong>Plano:</strong> Premium (30 dias)
            </li>
          </ul>

          <h5>🎯 O que você receberá:</h5>
          <ul>
            <li>✅ Acesso completo como administrador</li>
            <li>✅ Upload ilimitado de imagens e vídeos</li>
            <li>✅ Gerenciamento de diretórios</li>
            <li>✅ Edição de mídias</li>
            <li>✅ Relatórios avançados</li>
          </ul>
        </div>

        {result && (
          <div className={`result ${result.success ? "success" : "error"}`}>
            <h5>{result.success ? "✅ Sucesso!" : "❌ Erro:"}</h5>
            {result.message && <p className="result-message">{result.message}</p>}
            {result.nextSteps && <p className="next-steps">{result.nextSteps}</p>}
            <details>
              <summary>Ver detalhes técnicos</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>

      <div className="debug-section">
        <h4>👤 Informações da Conta</h4>
        <div className="user-info-debug">
          <p>
            <strong>ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Nome:</strong> {user.username}
          </p>
          <p>
            <strong>Role Atual:</strong>{" "}
            <span className={`role-badge ${user.role}`}>{user.role === "admin" ? "👑 Admin" : "👤 Usuário"}</span>
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={`status-badge ${user.subscription_status || "none"}`}>
              {user.subscription_status === "premium" ? "💎 Premium" : "🆓 Gratuito"}
            </span>
          </p>
          <p>
            <strong>Vencimento:</strong> {user.subscription_end_date || "N/A"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminDebugPanel
