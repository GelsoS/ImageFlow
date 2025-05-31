"use client"

import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import "../styles/PixPaymentStatus.css"

function PixPaymentStatus({ paymentId, userId, onPaymentConfirmed }) {
  const [status, setStatus] = useState("pending")
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutos
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verificar status a cada 5 segundos
    const statusInterval = setInterval(checkPaymentStatus, 5000)

    // Countdown timer
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(statusInterval)
          clearInterval(timerInterval)
          setChecking(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Verificação inicial
    checkPaymentStatus()

    return () => {
      clearInterval(statusInterval)
      clearInterval(timerInterval)
    }
  }, [])

  async function checkPaymentStatus() {
    try {
      // Verificar no banco se o pagamento foi processado
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .eq("payment_id", paymentId)
        .single()

      if (data && data.status === "active") {
        setStatus("approved")
        setChecking(false)
        onPaymentConfirmed()
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (status === "approved") {
    return (
      <div className="pix-status-container success">
        <div className="status-icon">✅</div>
        <h3>Pagamento Confirmado!</h3>
        <p>Seu PIX foi processado com sucesso.</p>
        <button onClick={() => (window.location.href = "/")} className="continue-btn">
          Continuar
        </button>
      </div>
    )
  }

  return (
    <div className="pix-status-container pending">
      <div className="status-icon">⏳</div>
      <h3>Aguardando Pagamento PIX</h3>
      <p>Escaneie o QR Code ou copie o código PIX para finalizar o pagamento.</p>

      {checking && (
        <div className="checking-status">
          <div className="spinner"></div>
          <p>Verificando pagamento... {formatTime(timeLeft)}</p>
        </div>
      )}

      {!checking && timeLeft === 0 && (
        <div className="timeout-message">
          <p>Tempo limite atingido. Se você já fez o PIX, aguarde alguns minutos.</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Verificar Novamente
          </button>
        </div>
      )}

      <div className="manual-check">
        <button onClick={checkPaymentStatus} className="check-btn">
          Verificar Pagamento Manualmente
        </button>
      </div>
    </div>
  )
}

export default PixPaymentStatus
