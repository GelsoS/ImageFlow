"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/AdminDebugPanel.css"

function AdminDebugPanel({ user }) {
  const [paymentId, setPaymentId] = useState("")
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [result, setResult] = useState(null)

  // 🔍 Validação completa do Payment ID
  async function validatePaymentId(id) {
    if (!id.trim()) {
      setValidationResult(null)
      return
    }

    setValidating(true)
    setValidationResult(null)

    try {
      console.log("🔍 Validando Payment ID:", id)

      // ETAPA 1: Verificar se o payment_id já foi usado no nosso sistema
      const { data: existingSubscription, error: dbError } = await supabase
        .from("subscriptions")
        .select("user_id, payment_id, status, created_at")
        .eq("payment_id", id.trim())
        .maybeSingle()

      if (dbError) {
        console.error("Erro ao verificar payment_id no banco:", dbError)
        setValidationResult({
          valid: false,
          message: "❌ Erro ao verificar pagamento no banco de dados",
          type: "error",
        })
        return
      }

      if (existingSubscription) {
        console.log("⚠️ Payment ID já utilizado:", existingSubscription)

        if (existingSubscription.user_id === user.id) {
          setValidationResult({
            valid: false,
            message: "⚠️ Você já utilizou este ID de pagamento",
            type: "warning",
            details: `Usado em: ${new Date(existingSubscription.created_at).toLocaleDateString()}`,
          })
        } else {
          setValidationResult({
            valid: false,
            message: "🚨 Este ID de pagamento já foi utilizado por outra conta",
            type: "error",
            details: "Cada pagamento só pode ser usado uma vez",
          })
        }
        return
      }

      // ETAPA 2: Verificar se o pagamento existe no Mercado Pago
      console.log("🔍 Verificando pagamento no Mercado Pago...")

      const mpResponse = await fetch("/api/debug/validate-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId: id.trim(),
          userId: user.id,
        }),
      })

      const mpResult = await mpResponse.json()

      if (!mpResponse.ok) {
        console.error("Erro na validação do MP:", mpResult)
        setValidationResult({
          valid: false,
          message: mpResult.error || "❌ Erro ao validar pagamento",
          type: "error",
          details: mpResult.details || "Verifique se o ID do pagamento está correto",
        })
        return
      }

      if (!mpResult.valid) {
        setValidationResult({
          valid: false,
          message: mpResult.message || "❌ Pagamento inválido",
          type: "error",
          details: mpResult.details,
        })
        return
      }

      // ETAPA 3: Tudo OK!
      setValidationResult({
        valid: true,
        message: "✅ Pagamento válido e disponível",
        type: "success",
        details: `Valor: R$ ${mpResult.amount} | Status: ${mpResult.status}`,
        paymentData: mpResult.paymentData,
      })
    } catch (error) {
      console.error("Erro na validação:", error)
      setValidationResult({
        valid: false,
        message: "❌ Erro ao validar pagamento",
        type: "error",
        details: "Verifique sua conexão e tente novamente",
      })
    } finally {
      setValidating(false)
    }
  }

  // Função chamada quando o usuário digita
  function handlePaymentIdChange(value) {
    setPaymentId(value)
    setResult(null)

    // Validar após 800ms de pausa na digitação (debounce)
    clearTimeout(window.paymentValidationTimeout)
    window.paymentValidationTimeout = setTimeout(() => {
      validatePaymentId(value)
    }, 800)
  }

  async function activateSubscriptionDirect() {
    // Verificar se o payment_id é válido antes de prosseguir
    if (!validationResult || !validationResult.valid) {
      alert("❌ Por favor, insira um ID de pagamento válido e disponível")
      return
    }

    if (!paymentId.trim()) {
      alert("Digite o ID do pagamento")
      return
    }

    if (
      !confirm(
        `Tem certeza que deseja ativar a assinatura premium?\n\nPagamento: ${paymentId}\nValor: ${validationResult.details}`,
      )
    ) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log("=== Iniciando ativação da assinatura ===")

      // Usar os dados do pagamento já validados
      const paymentData = validationResult.paymentData

      // Criar nova assinatura
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const subscriptionData = {
        user_id: user.id,
        plan_type: "premium",
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_method: paymentData.payment_method_id || "pix",
        payment_id: paymentId.trim(),
        amount: paymentData.transaction_amount || 9.9,
        currency: paymentData.currency_id || "BRL",
      }

      const { data: newSubscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert([subscriptionData])
        .select()
        .single()

      if (subscriptionError) {
        console.error("Erro ao criar assinatura:", subscriptionError)

        // Se for erro de constraint único (payment_id duplicado)
        if (subscriptionError.code === "23505") {
          setResult({
            success: false,
            error: "🚨 Este ID de pagamento já foi utilizado",
            details: "Alguém utilizou este ID enquanto você estava processando",
          })
          // Revalidar o payment ID
          validatePaymentId(paymentId)
          return
        }

        throw new Error("Erro ao criar assinatura: " + subscriptionError.message)
      }

      // Atualizar perfil do usuário
      const { data: updatedProfile, error: profileError } = await supabase
        .from("profiles")
        .update({
          role: "admin",
          subscription_status: "premium",
          subscription_end_date: endDate.toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single()

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError)
        throw new Error("Erro ao atualizar perfil: " + profileError.message)
      }

      setResult({
        success: true,
        message: "🎉 Assinatura Premium ativada com sucesso!",
        subscription: newSubscription,
        profile: updatedProfile,
        nextSteps: "Recarregue a página para ver as mudanças",
      })

      alert("🎉 Assinatura Premium ativada com sucesso!\n\nRecarregue a página para acessar todos os recursos.")

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
      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) {
        throw new Error("Erro ao verificar perfil: " + profileError.message)
      }

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
          <strong>Insira o ID do seu pagamento aprovado:</strong>
        </p>

        <div className="payment-check">
          <div className="payment-input-container">
            <input
              type="text"
              value={paymentId}
              onChange={(e) => handlePaymentIdChange(e.target.value)}
              placeholder="ID do Pagamento (ex: 113535423120)"
              className={`payment-input ${validationResult ? (validationResult.valid ? "valid" : "invalid") : ""}`}
              disabled={loading}
            />

            {/* Indicador de validação */}
            <div className="validation-indicator">
              {validating && <span className="validating">🔄</span>}
              {validationResult && !validating && (
                <span className={`validation-icon ${validationResult.type}`}>
                  {validationResult.type === "success" && "✅"}
                  {validationResult.type === "warning" && "⚠️"}
                  {validationResult.type === "error" && "❌"}
                </span>
              )}
            </div>
          </div>

          {/* Mensagem de validação */}
          {validationResult && (
            <div className={`validation-message ${validationResult.type}`}>
              <p>{validationResult.message}</p>
              {validationResult.details && <small>{validationResult.details}</small>}
            </div>
          )}

          <button
            onClick={activateSubscriptionDirect}
            disabled={loading || !validationResult || !validationResult.valid}
            className={`process-btn ${validationResult && validationResult.valid ? "enabled" : "disabled"}`}
          >
            {loading ? "🔄 Ativando..." : "🚀 Ativar Premium"}
          </button>
        </div>

        <div className="status-check">
          <button onClick={checkCurrentStatus} className="status-btn">
            📊 Verificar Status Atual
          </button>
        </div>

        {/* <div className="payment-info">
          <h5>🔍 Validação em 3 Etapas:</h5>
          <ul>
            <li>
              ✅ <strong>Etapa 1:</strong> Verifica se o ID já foi usado no sistema
            </li>
            <li>
              🔍 <strong>Etapa 2:</strong> Confirma se o pagamento existe no Mercado Pago
            </li>
            <li>
              ✅ <strong>Etapa 3:</strong> Valida se o pagamento foi aprovado e pertence a você
            </li>
          </ul>

          <h5>🚨 Proteções de Segurança:</h5>
          <ul>
            <li>❌ IDs inventados são rejeitados</li>
            <li>🚫 IDs já utilizados são bloqueados</li>
            <li>🔒 Pagamentos de outras contas são negados</li>
            <li>⚠️ Apenas pagamentos aprovados são aceitos</li>
          </ul>

          <h5>🎯 O que você receberá:</h5>
          <ul>
            <li>✅ Acesso completo como administrador</li>
            <li>✅ Upload ilimitado de imagens e vídeos</li>
            <li>✅ Gerenciamento de diretórios</li>
            <li>✅ Edição de mídias</li>
            <li>✅ Relatórios avançados</li>
          </ul>
        </div> */}

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
