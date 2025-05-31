import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Criar cliente Supabase com chave de serviço para operações administrativas
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  console.log("--- Webhook Mercado Pago recebido ---")

  try {
    const body = await request.json()
    console.log("Dados do webhook:", body)

    // Verificar se é uma notificação de pagamento
    if (body.type === "payment") {
      const paymentId = body.data.id

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const paymentData = await paymentResponse.json()
      console.log("Dados do pagamento:", paymentData)

      if (paymentData.status === "approved") {
        // Pagamento aprovado - ativar assinatura
        const userId = paymentData.external_reference

        if (userId) {
          // Criar/atualizar assinatura
          const startDate = new Date()
          const endDate = new Date()
          endDate.setDate(endDate.getDate() + 30)

          const { error: subscriptionError } = await supabaseAdmin.from("subscriptions").upsert([
            {
              user_id: userId,
              plan_type: "premium",
              status: "active",
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              payment_method: paymentData.payment_method_id || "mercadopago",
              payment_id: paymentId,
              amount: paymentData.transaction_amount,
              currency: paymentData.currency_id,
            },
          ])

          if (subscriptionError) {
            console.error("Erro ao criar assinatura:", subscriptionError)
          }

          // Atualizar perfil do usuário
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
              role: "admin",
              subscription_status: "premium",
              subscription_end_date: endDate.toISOString(),
            })
            .eq("id", userId)

          if (profileError) {
            console.error("Erro ao atualizar perfil:", profileError)
          }

          console.log("Assinatura ativada para usuário:", userId)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro no webhook:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
