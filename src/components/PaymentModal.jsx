"use client"

import { useState } from "react"
import { supabase } from "../supabaseClient"
import "../styles/PaymentModal.css"

function PaymentModal({ user, onClose, onPaymentSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState("mercadopago")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const paymentMethods = [
    {
      id: "mercadopago",
      name: "Mercado Pago",
      icon: "💳",
      description: "Cartão, PIX, Boleto",
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: "🅿️",
      description: "Cartão, Conta PayPal",
    },
    {
      id: "bb",
      name: "Banco do Brasil",
      icon: "🏦",
      description: "Transferência, PIX",
    },
  ]

  async function handlePayment() {
    setLoading(true)
    setError(null)

    try {
      // Simular processamento de pagamento
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Criar nova assinatura
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30) // 30 dias

      const { error: subscriptionError } = await supabase.from("subscriptions").insert([
        {
          user_id: user.id,
          plan_type: "premium",
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_method: selectedMethod,
          payment_id: `${selectedMethod}_${Date.now()}`,
          amount: 99.9,
          currency: "BRL",
        },
      ])

      if (subscriptionError) throw subscriptionError

      // Atualizar perfil do usuário
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          subscription_status: "premium",
          subscription_end_date: endDate.toISOString(),
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      onPaymentSuccess()
    } catch (error) {
      setError("Erro ao processar pagamento: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <h3>Sistema de Cobrança - Admin</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-content">
          <div className="plan-info">
            <h4>Plano Premium Administrativo</h4>
            <div className="price">R$ 99,90/mês</div>
            <ul className="features">
              <li>✅ Gerenciamento completo de usuários</li>
              <li>✅ Upload ilimitado de mídias</li>
              <li>✅ Relatórios avançados</li>
              <li>✅ Suporte técnico prioritário</li>
              <li>✅ Backup automático</li>
              <li>✅ API de integração</li>
            </ul>
          </div>

          <div className="payment-methods">
            <h4>Escolha a forma de pagamento:</h4>
            {paymentMethods.map((method) => (
              <label key={method.id} className="payment-method">
                <input
                  type="radio"
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
            <button className="pay-btn" onClick={handlePayment} disabled={loading}>
              {loading ? "Processando..." : "Pagar R$ 99,90"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal
