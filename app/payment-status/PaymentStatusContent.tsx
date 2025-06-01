"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import "../../src/styles/PaymentStatus.css"

export default function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState("Processando seu pagamento...")
  const [status, setStatus] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const paymentStatus = searchParams.get("status")
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id")
    const externalReference = searchParams.get("external_reference")
    const collectionStatus = searchParams.get("collection_status")

    console.log("Payment status params:", {
      paymentStatus,
      paymentId,
      externalReference,
      collectionStatus,
    })

    setStatus(paymentStatus || collectionStatus)
    setDetails({
      paymentId: paymentId || "N/A",
      externalReference: externalReference || "N/A",
    })

    if (paymentStatus === "success" || paymentStatus === "approved" || collectionStatus === "approved") {
      setMessage("Pagamento aprovado! Sua assinatura foi ativada.")

      // Se o pagamento foi aprovado, aguardar um pouco e então processar
      if (paymentId && externalReference) {
        setIsProcessing(true)
        // Aguardar 3 segundos para dar tempo do webhook processar
        setTimeout(() => {
          setIsProcessing(false)
          setMessage("Pagamento aprovado! Sua assinatura foi ativada. Você pode voltar ao início.")
        }, 3000)
      }
    } else if (paymentStatus === "pending") {
      setMessage("Pagamento pendente. Aguardando confirmação. Você será notificado por e-mail.")
    } else if (paymentStatus === "failure" || paymentStatus === "rejected") {
      setMessage("Pagamento falhou. Por favor, tente novamente ou contate o suporte.")
    } else {
      setMessage("Status de pagamento desconhecido.")
    }
  }, [searchParams])

  const handleBackToHome = () => {
    // Forçar reload da página principal para atualizar o status do usuário
    window.location.href = "/"
  }

  return (
    <div className="payment-status-container">
      <div className="payment-status-card">
        {status === "success" || status === "approved" ? (
          <div className="status-icon success">✓</div>
        ) : status === "pending" ? (
          <div className="status-icon pending">⏳</div>
        ) : (
          <div className="status-icon failure">✕</div>
        )}
        <h1>Status do Pagamento</h1>

        {isProcessing && (
          <div className="processing-message">
            <div className="spinner"></div>
            <p>Processando sua assinatura...</p>
          </div>
        )}

        <p className="status-message">{message}</p>

        {details.paymentId !== "N/A" && (
          <div className="payment-details">
            <p>
              <strong>ID do Pagamento:</strong> {details.paymentId}
            </p>
            {details.externalReference !== "N/A" && (
              <p>
                <strong>Referência:</strong> {details.externalReference}
              </p>
            )}
          </div>
        )}

        <button onClick={handleBackToHome} className="home-button">
          Voltar para o Início
        </button>
      </div>
    </div>
  )
}
