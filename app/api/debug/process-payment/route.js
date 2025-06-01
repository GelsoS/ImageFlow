import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  try {
    console.log("=== Iniciando processamento manual de pagamento ===")

    const body = await request.json()
    const { paymentId, userId } = body

    console.log("Dados recebidos:", { paymentId, userId })

    if (!paymentId || !userId) {
      console.error("Dados faltando:", { paymentId, userId })
      return NextResponse.json(
        {
          error: "Payment ID e User ID são obrigatórios",
          received: { paymentId, userId },
        },
        { status: 400 },
      )
    }

    // Verificar variáveis de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Variáveis de ambiente do Supabase não configuradas")
      return NextResponse.json(
        {
          error: "Configuração do servidor incompleta",
        },
        { status: 500 },
      )
    }

    console.log("Verificando assinatura existente...")

    // Verificar se já existe assinatura para este pagamento
    const { data: existingSubscription, error: checkError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle()

    if (checkError) {
      console.error("Erro ao verificar assinatura existente:", checkError)
      return NextResponse.json(
        {
          error: "Erro ao verificar assinatura existente",
          details: checkError.message,
        },
        { status: 500 },
      )
    }

    console.log("Assinatura existente:", existingSubscription)

    if (existingSubscription) {
      console.log("Assinatura já existe, verificando perfil do usuário...")

      // Verificar se o usuário já está como admin
      const { data: userProfile, error: profileCheckError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (profileCheckError) {
        console.error("Erro ao verificar perfil:", profileCheckError)
        return NextResponse.json(
          {
            error: "Erro ao verificar perfil do usuário",
            details: profileCheckError.message,
          },
          { status: 500 },
        )
      }

      console.log("Perfil atual do usuário:", userProfile)

      if (userProfile && userProfile.role === "admin") {
        return NextResponse.json({
          success: true,
          message: "Usuário já é admin e assinatura já existe",
          subscription: existingSubscription,
          profile: userProfile,
        })
      }

      // Atualizar perfil do usuário para admin
      console.log("Atualizando perfil para admin...")
      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          role: "admin",
          subscription_status: "premium",
          subscription_end_date: existingSubscription.end_date,
        })
        .eq("id", userId)
        .select()

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError)
        return NextResponse.json(
          {
            error: "Erro ao atualizar perfil",
            details: profileError.message,
          },
          { status: 500 },
        )
      }

      console.log("Perfil atualizado com sucesso:", updatedProfile)

      return NextResponse.json({
        success: true,
        message: "Perfil atualizado para admin com sucesso!",
        subscription: existingSubscription,
        profile: updatedProfile,
      })
    }

    // Criar nova assinatura
    console.log("Criando nova assinatura...")
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
      payment_id: paymentId,
      amount: 9.9,
      currency: "BRL",
    }

    console.log("Dados da assinatura a ser criada:", subscriptionData)

    const { data: newSubscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .insert([subscriptionData])
      .select()

    if (subscriptionError) {
      console.error("Erro ao criar assinatura:", subscriptionError)
      return NextResponse.json(
        {
          error: "Erro ao criar assinatura",
          details: subscriptionError.message,
          subscriptionData: subscriptionData,
        },
        { status: 500 },
      )
    }

    console.log("Assinatura criada:", newSubscription)

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
      return NextResponse.json(
        {
          error: "Erro ao atualizar perfil",
          details: profileError.message,
        },
        { status: 500 },
      )
    }

    console.log("Perfil atualizado:", profileData)
    console.log("=== Processamento concluído com sucesso ===")

    return NextResponse.json({
      success: true,
      message: "Assinatura criada e perfil atualizado com sucesso!",
      subscription: newSubscription,
      profile: profileData,
    })
  } catch (error) {
    console.error("=== ERRO GERAL NO PROCESSAMENTO ===")
    console.error("Error name:", error.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error.message,
        type: error.name,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de processamento de pagamento funcionando",
    timestamp: new Date().toISOString(),
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  })
}
