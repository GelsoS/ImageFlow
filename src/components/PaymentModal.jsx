"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import PixPaymentStatus from "./PixPaymentStatus"
import "../styles/PaymentModal.css"

function PaymentModal({ user, onClose, onPaymentSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState("mercadopago")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showPixStatus, setShowPixStatus] = useState(false)
  const [currentPaymentId, setCurrentPaymentId] = useState(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [loadingSubscription, setLoadingSubscription] = useState(true)

  const planDetails = {
    admin: {
      name: "Plano Premium Administrativo",
      price: 9.9,
      currency: "BRL",
      description: "Acesso completo para administradores.",
      features: [
        "Upload ilimitado de mídias",
        "Relatórios avançados",
        "Suporte técnico prioritário",
        "Backup automático"
      ],
    },
  }

  const currentPlan = planDetails.admin

  const paymentMethods = [
    {
      id: "mercadopago",
      name: "Mercado Pago",
      icon: "💳",
      description: "Cartão, PIX, Boleto",
    },
  ]

  useEffect(() => {
    checkSubscriptionStatus()
  }, [user])

  async function checkSubscriptionStatus() {
    try {
      setLoadingSubscription(true)

      // Buscar assinatura ativa do usuário
      const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)

      if (error) {
        console.error("Erro ao buscar assinatura:", error)
        return
      }

      const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null

      if (subscription) {
        const endDate = new Date(subscription.end_date)
        const now = new Date()
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))

        setSubscriptionInfo({
          ...subscription,
          daysRemaining,
          isExpired: daysRemaining <= 0,
        })

        // Se a assinatura expirou, rebaixar para user
        if (daysRemaining <= 0) {
          await handleExpiredSubscription(subscription.id)
        }
      } else {
        // Não tem assinatura ativa - considerar como expirada
        setSubscriptionInfo({
          daysRemaining: 0,
          isExpired: true,
        })

        // Se for admin sem assinatura, rebaixar para user
        if (user.role === "admin") {
          await handleNoSubscription()
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status da assinatura:", error)
    } finally {
      setLoadingSubscription(false)
    }
  }

  async function handleNoSubscription() {
    try {
      // Rebaixar usuário para role "user" se for admin sem assinatura
      await supabase
        .from("profiles")
        .update({
          role: "user",
          subscription_status: "none",
        })
        .eq("id", user.id)

      console.log("Usuário rebaixado para role 'user' por não ter assinatura ativa")

      // Atualizar o objeto user local para refletir a mudança
      user.role = "user"
      user.subscription_status = "none"

      // Opcional: recarregar a página para refletir as mudanças
      // window.location.reload()
    } catch (error) {
      console.error("Erro ao rebaixar usuário sem assinatura:", error)
    }
  }

  async function handleExpiredSubscription(subscriptionId) {
    try {
      // Marcar assinatura como expirada
      await supabase.from("subscriptions").update({ status: "expired" }).eq("id", subscriptionId)

      // Rebaixar usuário para role "user"
      await supabase
        .from("profiles")
        .update({
          role: "user",
          subscription_status: "expired",
        })
        .eq("id", user.id)

      console.log("Usuário rebaixado para role 'user' devido à assinatura expirada")

      // Atualizar o objeto user local para refletir a mudança
      user.role = "user"
      user.subscription_status = "expired"
    } catch (error) {
      console.error("Erro ao processar assinatura expirada:", error)
    }
  }

  async function handlePayment() {
    setLoading(true)
    setError(null)

    if (selectedMethod === "mercadopago") {
      try {
        const response = await fetch("/api/mercado-pago/create-preference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            items: [
              {
                title: currentPlan.name,
                quantity: 1,
                unit_price: currentPlan.price,
                currency_id: currentPlan.currency,
                description: currentPlan.description,
              },
            ],
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          console.error("Erro da API ao criar preferência:", data)
          throw data
        }

        if (data.init_point) {
          console.log("Redirecionando para o Mercado Pago init_point:", data.init_point)

          // Abrir em nova aba para PIX
          const paymentWindow = window.open(data.init_point, "_blank")

          // Mostrar status de acompanhamento
          setShowPixStatus(true)
          setCurrentPaymentId(data.id)
          setLoading(false)

          // Opcional: Fechar a janela de pagamento após um tempo
          setTimeout(() => {
            if (paymentWindow && !paymentWindow.closed) {
              paymentWindow.close()
            }
          }, 300000) // 5 minutos
        } else {
          throw new Error("URL de checkout não recebida do Mercado Pago.")
        }
      } catch (apiError) {
        console.error("Erro capturado no handlePayment:", apiError)
        const displayMessage = apiError.error || apiError.message || "Ocorreu um erro desconhecido."
        const displayDetails = apiError.details
          ? typeof apiError.details === "string"
            ? apiError.details
            : JSON.stringify(apiError.details)
          : "Sem detalhes adicionais."
        setError(`${displayMessage} (Detalhes: ${displayDetails})`)
        setLoading(false)
      }
    }
  }

  function handlePixPaymentConfirmed() {
    setShowPixStatus(false)
    onPaymentSuccess()
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  if (showPixStatus) {
    return (
      <div className="payment-modal-overlay">
        <div className="payment-modal">
          <div className="modal-header">
            <h3>Status do Pagamento PIX</h3>
            <button className="close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-content">
            <PixPaymentStatus
              paymentId={currentPaymentId}
              userId={user.id}
              onPaymentConfirmed={handlePixPaymentConfirmed}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <h3>{currentPlan.name}</h3>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="modal-content">
          {(!subscriptionInfo || subscriptionInfo.isExpired) && (
            <div className="plan-info">
              <div className="price">R$ {currentPlan.price.toFixed(2)}/mês</div>
              <ul className="features">
                {currentPlan.features.map((feature, index) => (
                  <li key={index}>✅ {feature}</li>
                ))}
              </ul>
            </div>
          )}

          {loadingSubscription ? (
            <div className="loading-subscription">
              <div className="spinner"></div>
              <p>Verificando status da assinatura...</p>
            </div>
          ) : subscriptionInfo && !subscriptionInfo.isExpired ? (
            // Assinatura ativa - mostrar dias restantes
            <div className="subscription-active">
              <div className="active-subscription-info">
                <div className="status-icon active">✅</div>
                <h4>Assinatura Ativa</h4>
                <div className="subscription-details">
                  <p className="days-remaining">
                    <strong>{subscriptionInfo.daysRemaining}</strong> dia
                    {subscriptionInfo.daysRemaining !== 1 ? "s" : ""} restante
                    {subscriptionInfo.daysRemaining !== 1 ? "s" : ""}
                  </p>
                  <p className="next-payment">
                    Próximo pagamento: <strong>{formatDate(subscriptionInfo.end_date)}</strong>
                  </p>
                  <p className="payment-method">
                    Método: <strong>{subscriptionInfo.payment_method?.toUpperCase() || "N/A"}</strong>
                  </p>
                </div>
              </div>

              <div className="renewal-info">
                <p>
                  Sua assinatura será renovada automaticamente. Você receberá um lembrete por e-mail antes do
                  vencimento.
                </p>
              </div>
            </div>
          ) : (
            // Sem assinatura ou expirada - mostrar opções de pagamento
            <>
              <div className="subscription-expired">
                <div className="status-icon expired">⚠️</div>
                <h4>{subscriptionInfo?.end_date ? "Assinatura Expirada" : "Sem Assinatura Ativa"}</h4>
                {subscriptionInfo?.end_date ? (
                  <p>
                    Sua assinatura expirou em <strong>{formatDate(subscriptionInfo.end_date)}</strong>. Sua conta foi
                    temporariamente rebaixada para usuário comum.
                  </p>
                ) : (
                  <p>
                    Você não possui uma assinatura ativa. Assine agora para obter acesso aos recursos administrativos!
                  </p>
                )}
                <p>Assine agora para obter todos os recursos administrativos!</p>
              </div>

              <div className="payment-methods">
                <h4>Escolha a forma de pagamento:</h4>
                {paymentMethods.map((method) => (
                  <label key={method.id} className={`payment-method ${selectedMethod === method.id ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedMethod === method.id}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      disabled={loading}
                    />
                    <div className="method-info">
                      <span className="method-icon">{method.icon}</span>
                      <div>
                        <div className="method-name">{method.name}</div>
                        <div className="method-description">{method.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button className="cancel-btn" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button className="pay-btn" onClick={handlePayment} disabled={loading || !selectedMethod}>
                  {loading
                    ? "Processando..."
                    : subscriptionInfo?.end_date
                      ? `Renovar R$ ${currentPlan.price.toFixed(2)}`
                      : `Assinar R$ ${currentPlan.price.toFixed(2)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PaymentModal
