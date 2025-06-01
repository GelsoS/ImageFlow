import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  try {
    const { paymentId, userId } = await request.json()

    console.log("=== DEBUG: Verificando pagamento ===")
    console.log("Payment ID:", paymentId)
    console.log("User ID:", userId)

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID é obrigatório" }, { status: 400 })
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json({ error: "Token do Mercado Pago não configurado" }, { status: 500 })
    }

    console.log("Buscando pagamento no Mercado Pago...")
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!paymentResponse.ok) {
      console.error("Erro ao buscar pagamento:", paymentResponse.status)
      return NextResponse.json(
        {
          error: "Erro ao buscar pagamento no Mercado Pago",
          status: paymentResponse.status,
        },
        { status: 500 },
      )
    }

    const paymentData = await paymentResponse.json()
    console.log("Dados do pagamento:", JSON.stringify(paymentData, null, 2))

    // Verificar se já existe assinatura para este pagamento
    const { data: existingSubscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("payment_id", paymentId)
      .single()

    console.log("Assinatura existente:", existingSubscription)

    // Se o pagamento foi aprovado e não há assinatura, processar
    if (paymentData.status === "approved" && !existingSubscription) {
      const userIdToUse = userId || paymentData.external_reference

      if (!userIdToUse) {
        return NextResponse.json(
          {
            error: "User ID não encontrado",
            paymentData: paymentData,
          },
          { status: 400 },
        )
      }

      console.log("Processando pagamento aprovado para usuário:", userIdToUse)

      // Criar assinatura
      const startDate = new Date()
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)

      const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
        .from("subscriptions")
        .insert([
          {
            user_id: userIdToUse,
            plan_type: "premium",
            status: "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            payment_method: paymentData.payment_method_id || "pix",
            payment_id: paymentId,
            amount: paymentData.transaction_amount,
            currency: paymentData.currency_id,
          },
        ])
        .select()

      if (subscriptionError) {
        console.error("Erro ao criar assinatura:", subscriptionError)
        return NextResponse.json(
          {
            error: "Erro ao criar assinatura",
            details: subscriptionError,
          },
          { status: 500 },
        )
      }

      // Atualizar perfil do usuário
      const { data: profileData, error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          role: "admin",
          subscription_status: "premium",
          subscription_end_date: endDate.toISOString(),
        })
        .eq("id", userIdToUse)
        .select()

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError)
        return NextResponse.json(
          {
            error: "Erro ao atualizar perfil",
            details: profileError,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Pagamento processado com sucesso!",
        paymentData: paymentData,
        subscriptionData: subscriptionData,
        profileData: profileData,
      })
    }

    return NextResponse.json({
      paymentData: paymentData,
      existingSubscription: existingSubscription,
      message: existingSubscription ? "Assinatura já existe" : "Pagamento não aprovado ou já processado",
    })
  } catch (error) {
    console.error("Erro no debug:", error)
    return NextResponse.json(
      {
        error: "Erro interno",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
