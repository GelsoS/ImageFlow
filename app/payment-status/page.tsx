"use client"

import { Suspense } from "react"
import PaymentStatusContent from "./PaymentStatusContent"

function PaymentStatusLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to bottom, #87ceeb 0%, #98d8e8 30%, #90ee90 70%, #228b22 100%)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "3rem 2rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
          textAlign: "center",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "1.5rem", color: "#ffc107" }}>⏳</div>
        <h1 style={{ color: "#2c3e50", fontSize: "2rem", marginBottom: "1rem", fontWeight: "600" }}>Carregando...</h1>
        <p style={{ color: "#666", fontSize: "1.1rem", lineHeight: "1.6" }}>Verificando status do pagamento...</p>
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
