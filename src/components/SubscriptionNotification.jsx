"use client"

import { useState, useEffect } from "react"
import "../styles/SubscriptionNotification.css"

function SubscriptionNotification({ user, onUpgradeClick }) {
  const [daysRemaining, setDaysRemaining] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState("free")

  useEffect(() => {
    calculateDaysRemaining()
  }, [user])

  function calculateDaysRemaining() {
    if (user.subscription_end_date && user.subscription_status === "premium") {
      const endDate = new Date(user.subscription_end_date)
      const today = new Date()
      const diffTime = endDate - today
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      setDaysRemaining(Math.max(0, diffDays))
      setSubscriptionStatus("premium")
    } else {
      setSubscriptionStatus("free")
      setDaysRemaining(null)
    }
  }

  if (subscriptionStatus === "free") {
    return (
      <div className="subscription-notification free">
        <div className="notification-content">
          <span className="notification-icon">⚠️</span>
          <div className="notification-text">
            <strong>Conta Gratuita</strong>
            <p>Faça upgrade para acessar recursos premium</p>
          </div>
          {onUpgradeClick && (
            <button className="upgrade-btn" onClick={onUpgradeClick}>
              Fazer Upgrade
            </button>
          )}
        </div>
      </div>
    )
  }

  if (subscriptionStatus === "premium" && daysRemaining !== null) {
    const isExpiringSoon = daysRemaining <= 7
    const isExpired = daysRemaining <= 0

    return (
      <div
        className={`subscription-notification premium ${isExpiringSoon ? "expiring" : ""} ${isExpired ? "expired" : ""}`}
      >
        <div className="notification-content">
          <span className="notification-icon">{isExpired ? "❌" : isExpiringSoon ? "⚠️" : "✅"}</span>
          <div className="notification-text">
            <strong>{isExpired ? "Assinatura Expirada" : "Assinatura Premium"}</strong>
            <p>
              {isExpired
                ? "Sua assinatura expirou. Renove para continuar usando os recursos premium."
                : `${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""} restante${daysRemaining !== 1 ? "s" : ""}`}
            </p>
          </div>
          {(isExpiringSoon || isExpired) && onUpgradeClick && (
            <button className="renew-btn" onClick={onUpgradeClick}>
              {isExpired ? "Renovar" : "Estender"}
            </button>
          )}
        </div>
      </div>
    )
  }

  return null
}

export default SubscriptionNotification
