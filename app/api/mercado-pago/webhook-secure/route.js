import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  console.log("--- Webhook Mercado Pago (Seguro) ---")

  try {
    const body = await request.json()
    console.log("Webhook recebido:", body)

    if (body.type === "payment") {
      const paymentId = body.data.id
      console.log("Processing payment ID:", paymentId)

      // 🔒 VERIFICAÇÃO 1: Payment ID já foi processado?
      const { data: existingSubscription } = await supabaseAdmin
        .from("subscriptions")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle()

      if (existingSubscription) {
        console.log("⚠️ Payment ID já processado:", paymentId)
        return NextResponse.json({
          received: true,
          message: "Pagamento já foi processado anteriormente",
          subscriptionId: existingSubscription.id,
        })
      }

      // Buscar detalhes do pagamento
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN
      if (!accessToken) {
        console.error("Token do Mercado Pago não configurado")
        return NextResponse.json({ error: "Configuração inválida" }, { status: 500 })
      }

      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!paymentResponse.ok) {
        console.error("Erro ao buscar pagamento no MP")
        return NextResponse.json({ error: "Erro ao validar pagamento" }, { status: 500 })
      }

      const paymentData = await paymentResponse.json()
      console.log("Dados do pagamento:", paymentData)

      if (paymentData.status === "approved") {
        const userId = paymentData.external_reference

        if (!userId) {
          console.error("external_reference (userId) não encontrado")
          return NextResponse.json({ error: "UserId não encontrado" }, { status: 400 })
        }

        // 🔒 VERIFICAÇÃO 2: Usuário já tem assinatura ativa?
        const { data: activeSubscriptions } = await supabaseAdmin
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .gte("end_date", new Date().toISOString())

        if (activeSubscriptions && activeSubscriptions.length > 0) {
          console.log("⚠️ Usuário já possui assinatura ativa")
          return NextResponse.json({
            received: true,
            message: "Usuário já possui assinatura ativa",
            activeSubscription: activeSubscriptions[0],
          })
        }

        // ✅ Criar assinatura
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        try {
          const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
            .from("subscriptions")
            .insert([
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
            .select()

          if (subscriptionError) {
            // Se for erro de constraint único
            if (subscriptionError.code === "23505") {
              console.log("Payment ID já existe (constraint)")
              return NextResponse.json({
                received: true,
                message: "Pagamento já foi processado",
              })
            }
            throw subscriptionError
          }

          // Atualizar perfil
          await supabaseAdmin
            .from("profiles")
            .update({
              role: "admin",
              subscription_status: "premium",
              subscription_end_date: endDate.toISOString(),
            })
            .eq("id", userId)

          console.log("✅ Assinatura ativada com sucesso")

          return NextResponse.json({
            success: true,
            message: "Assinatura ativada com sucesso",
            userId: userId,
            paymentId: paymentId,
          })
        } catch (error) {
          console.error("Erro ao processar assinatura:", error)
          return NextResponse.json({ error: "Erro ao processar" }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Erro no webhook:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
