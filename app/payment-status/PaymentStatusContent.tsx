"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

export default function PaymentStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState("Processando seu pagamento...")
  const [status, setStatus] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, string>>({})

  useEffect(() => {
    const paymentStatus = searchParams.get("status")
    const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id")
    const externalReference = searchParams.get("external_reference")
    // Outros parâmetros que o Mercado Pago pode enviar: collection_status, preference_id, site_id, processing_mode, merchant_account_id

    setStatus(paymentStatus)
    setDetails({
      paymentId: paymentId || "N/A",
      externalReference: externalReference || "N/A",
    })

    if (paymentStatus === "success" || paymentStatus === "approved") {
      setMessage("Pagamento aprovado! Sua assinatura foi ativada.")
    } else if (paymentStatus === "pending") {
      setMessage("Pagamento pendente. Aguardando confirmação. Você será notificado por e-mail.")
    } else if (paymentStatus === "failure" || paymentStatus === "rejected") {
      setMessage("Pagamento falhou. Por favor, tente novamente ou contate o suporte.")
    } else {
      setMessage("Status de pagamento desconhecido.")
    }
  }, [searchParams])

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

        <Link href="/" className="home-button">
          Voltar para o Início
        </Link>
      </div>
    </div>
  )
}
