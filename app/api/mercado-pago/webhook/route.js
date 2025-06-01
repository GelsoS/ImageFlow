import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Criar cliente Supabase com chave de serviço para operações administrativas
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export async function POST(request) {
  console.log("--- Webhook Mercado Pago recebido ---")

  try {
    const body = await request.json()
    console.log("Dados do webhook:", JSON.stringify(body, null, 2))

    // Verificar se é uma notificação de pagamento
    if (body.type === "payment") {
      const paymentId = body.data.id
      console.log("Processing payment ID:", paymentId)

      // Buscar detalhes do pagamento na API do Mercado Pago
      const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

      if (!accessToken) {
        console.error("MERCADO_PAGO_ACCESS_TOKEN não configurado")
        return NextResponse.json({ error: "Token não configurado" }, { status: 500 })
      }

      console.log("Buscando detalhes do pagamento no Mercado Pago...")
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!paymentResponse.ok) {
        console.error("Erro ao buscar pagamento:", paymentResponse.status, paymentResponse.statusText)
        return NextResponse.json({ error: "Erro ao buscar pagamento" }, { status: 500 })
      }

      const paymentData = await paymentResponse.json()
      console.log("Dados do pagamento do MP:", JSON.stringify(paymentData, null, 2))

      if (paymentData.status === "approved") {
        console.log("Pagamento aprovado! Processando assinatura...")

        // Pagamento aprovado - ativar assinatura
        const userId = paymentData.external_reference

        if (!userId) {
          console.error("external_reference (userId) não encontrado no pagamento")
          return NextResponse.json({ error: "UserId não encontrado" }, { status: 400 })
        }

        console.log("Ativando assinatura para usuário:", userId)

        // Criar/atualizar assinatura
        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + 30)

        console.log("Criando/atualizando assinatura...")
        const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
          .from("subscriptions")
          .upsert([
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
          console.error("Erro ao criar assinatura:", subscriptionError)
          return NextResponse.json({ error: "Erro ao criar assinatura" }, { status: 500 })
        }

        console.log("Assinatura criada/atualizada:", subscriptionData)

        // Atualizar perfil do usuário
        console.log("Atualizando perfil do usuário...")
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            role: "admin",
            subscription_status: "premium",
            subscription_end_date: endDate.toISOString(),
          })
          .eq("id", userId)
          .select()

        if (profileError) {
          console.error("Erro ao atualizar perfil:", profileError)
          return NextResponse.json({ error: "Erro ao atualizar perfil" }, { status: 500 })
        }

        console.log("Perfil atualizado:", profileData)
        console.log("✅ Assinatura ativada com sucesso para usuário:", userId)

        return NextResponse.json({
          success: true,
          message: "Assinatura ativada com sucesso",
          userId: userId,
          paymentId: paymentId,
        })
      } else {
        console.log("Pagamento não aprovado. Status:", paymentData.status)
        return NextResponse.json({
          received: true,
          message: "Pagamento não aprovado",
          status: paymentData.status,
        })
      }
    } else {
      console.log("Webhook recebido mas não é do tipo 'payment'. Tipo:", body.type)
      return NextResponse.json({ received: true, message: "Tipo de webhook não processado" })
    }
  } catch (error) {
    console.error("Erro no webhook:", error)
    return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 })
  }
}

// Adicionar método GET para debug
export async function GET() {
  return NextResponse.json({
    message: "Webhook Mercado Pago está funcionando",
    timestamp: new Date().toISOString(),
  })
}
