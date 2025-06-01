import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  try {
    const { paymentId, userId } = await request.json()

    if (!paymentId || !userId) {
      return NextResponse.json({ error: "Payment ID e User ID são obrigatórios" }, { status: 400 })
    }

    console.log("=== Verificação de Segurança ===")
    console.log("Payment ID:", paymentId)
    console.log("User ID:", userId)

    // 🔒 VERIFICAÇÃO 1: Payment ID já foi usado?
    const { data: existingSubscription, error: checkError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("payment_id", paymentId.trim())
      .maybeSingle()

    if (checkError) {
      console.error("Erro ao verificar payment_id:", checkError)
      return NextResponse.json({ error: "Erro ao verificar pagamento" }, { status: 500 })
    }

    if (existingSubscription) {
      console.log("⚠️ Payment ID já utilizado:", existingSubscription)

      // Se o payment_id já foi usado por OUTRO usuário
      if (existingSubscription.user_id !== userId) {
        console.log("🚨 TENTATIVA DE FRAUDE: Payment ID usado por outro usuário")
        return NextResponse.json(
          {
            error: "Este pagamento já foi utilizado por outra conta",
            code: "PAYMENT_ALREADY_USED_BY_OTHER_USER",
          },
          { status: 403 },
        )
      }

      // Se o payment_id já foi usado pelo MESMO usuário
      if (existingSubscription.user_id === userId) {
        console.log("⚠️ Payment ID já usado pelo mesmo usuário")

        // Verificar se a assinatura ainda está ativa
        const endDate = new Date(existingSubscription.end_date)
        const now = new Date()

        if (endDate > now && existingSubscription.status === "active") {
          return NextResponse.json(
            {
              error: "Você já possui uma assinatura ativa com este pagamento",
              subscription: existingSubscription,
              code: "SUBSCRIPTION_ALREADY_ACTIVE",
            },
            { status: 409 },
          )
        } else {
          return NextResponse.json(
            {
              error: "Este pagamento já foi utilizado anteriormente",
              code: "PAYMENT_ALREADY_USED",
            },
            { status: 409 },
          )
        }
      }
    }

    // 🔒 VERIFICAÇÃO 2: Usuário já tem assinatura ativa?
    const { data: activeSubscriptions, error: activeError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .gte("end_date", new Date().toISOString())

    if (activeError) {
      console.error("Erro ao verificar assinaturas ativas:", activeError)
      return NextResponse.json({ error: "Erro ao verificar assinaturas" }, { status: 500 })
    }

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      console.log("⚠️ Usuário já possui assinatura ativa")
      return NextResponse.json(
        {
          error: "Você já possui uma assinatura ativa",
          activeSubscription: activeSubscriptions[0],
          code: "USER_ALREADY_HAS_ACTIVE_SUBSCRIPTION",
        },
        { status: 409 },
      )
    }

    // 🔒 VERIFICAÇÃO 3: Validar pagamento no Mercado Pago
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (accessToken) {
      try {
        console.log("Validando pagamento no Mercado Pago...")
        const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json()
          console.log("Status do pagamento no MP:", paymentData.status)

          // Verificar se o pagamento foi realmente aprovado
          if (paymentData.status !== "approved") {
            return NextResponse.json(
              {
                error: "Pagamento não foi aprovado no Mercado Pago",
                paymentStatus: paymentData.status,
                code: "PAYMENT_NOT_APPROVED",
              },
              { status: 400 },
            )
          }

          // Verificar se o external_reference bate com o userId
          if (paymentData.external_reference && paymentData.external_reference !== userId) {
            console.log("🚨 TENTATIVA DE FRAUDE: external_reference não confere")
            return NextResponse.json(
              {
                error: "Pagamento não pertence a esta conta",
                code: "PAYMENT_USER_MISMATCH",
              },
              { status: 403 },
            )
          }
        }
      } catch (mpError) {
        console.error("Erro ao validar no MP:", mpError)
        // Continuar mesmo se não conseguir validar no MP
      }
    }

    // ✅ TODAS AS VERIFICAÇÕES PASSARAM - Criar assinatura
    console.log("✅ Todas as verificações passaram. Criando assinatura...")

    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    const subscriptionData = {
      user_id: userId,
      plan_type: "premium",
      status: "active",
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_method: "pix",
      payment_id: paymentId.trim(),
      amount: 9.9,
      currency: "BRL",
    }

    const { data: newSubscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert([subscriptionData])
      .select()
      .single()

    if (subscriptionError) {
      console.error("Erro ao criar assinatura:", subscriptionError)

      // Se for erro de constraint único (payment_id duplicado)
      if (subscriptionError.code === "23505") {
        return NextResponse.json(
          {
            error: "Este pagamento já foi utilizado",
            code: "PAYMENT_ID_ALREADY_EXISTS",
          },
          { status: 409 },
        )
      }

      return NextResponse.json({ error: "Erro ao criar assinatura", details: subscriptionError }, { status: 500 })
    }

    // Atualizar perfil do usuário
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
      return NextResponse.json({ error: "Erro ao atualizar perfil", details: profileError }, { status: 500 })
    }

    console.log("🎉 Assinatura criada com sucesso!")

    return NextResponse.json({
      success: true,
      message: "Assinatura ativada com sucesso!",
      subscription: newSubscription,
      profile: profileData,
    })
  } catch (error) {
    console.error("Erro geral:", error)
    return NextResponse.json({ error: "Erro interno do servidor", details: error.message }, { status: 500 })
  }
}
