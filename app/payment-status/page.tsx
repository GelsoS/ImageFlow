"use client"

import { Suspense } from "react"
import PaymentStatusContent from "./PaymentStatusContent"
//import "../../src/styles/PaymentStatus.css"

function PaymentStatusLoading() {
  return (
    <div className="payment-status-container">
      <div className="payment-status-card">
        <div className="status-icon pending">⏳</div>
        <h1>Carregando...</h1>
        <p className="status-message">Verificando status do pagamento...</p>
      </div>
    </div>
  )
}

export default function PaymentStatusPage() {
  return (
    <Suspense fallback={<PaymentStatusLoading />}>
      <PaymentStatusContent />
    </Suspense>
  )
}
