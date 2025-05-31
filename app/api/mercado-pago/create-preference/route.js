import { NextResponse } from "next/server"

export async function POST(request) {
  console.log("--- Iniciando API /api/mercado-pago/create-preference (Direct Fetch) ---")

  // Usar as variáveis de ambiente corretas
  const accessToken =
    process.env.MERCADO_PAGO_ACCESS_TOKEN || "APP_USR-2f97e286-aac2-41ec-8919-b3241d75ac73"
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.leiloescarros.com"

  console.log(
    "MP Access Token (first 5, last 5):",
    accessToken ? `${accessToken.substring(0, 5)}...${accessToken.slice(-5)}` : "NÃO DEFINIDO!!!",
  )
  console.log("NEXT_PUBLIC_APP_URL:", appUrl)

  if (!accessToken || accessToken.trim() === "") {
    console.error("Variável de ambiente MERCADO_PAGO_ACCESS_TOKEN não está definida ou está vazia.")
    return NextResponse.json({ error: "Configuração crítica do servidor incompleta (MP_TOKEN)." }, { status: 500 })
  }
  if (!appUrl) {
    console.error("Variável de ambiente NEXT_PUBLIC_APP_URL não está definida.")
    return NextResponse.json({ error: "Configuração crítica do servidor incompleta (APP_URL)." }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { userId, email, items } = body

    if (!userId || !items || !items.length || !email) {
      console.error("Dados insuficientes recebidos:", { userId, email, items })
      return NextResponse.json(
        { error: "Dados insuficientes para criar preferência (userId, email, items são obrigatórios)." },
        { status: 400 },
      )
    }

    const preferenceBody = {
      items: items.map((item) => ({
        id: item.id || `item-${userId}-${Date.now()}`,
        title: item.title || "Assinatura Premium",
        description: item.description || "Descrição do plano",
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price),
        currency_id: item.currency_id || "BRL",
      })),
      payer: {
        email: email,
      },
      back_urls: {
        success: `${appUrl}/payment-status?status=success&source=mp`,
        failure: `${appUrl}/payment-status?status=failure&source=mp`,
        pending: `${appUrl}/payment-status?status=pending&source=mp`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/mercado-pago/webhook?source=mp&user_id=${userId}`,
      external_reference: userId,
    }

    console.log(
      "Corpo da preferência a ser enviado ao Mercado Pago (Direct Fetch):",
      JSON.stringify(preferenceBody, null, 2),
    )

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `pref-${userId}-${Date.now()}`,
      },
      body: JSON.stringify(preferenceBody),
    })

    const responseData = await mpResponse.json()

    console.log("Resposta da API Mercado Pago (Direct Fetch):", { status: mpResponse.status, data: responseData })

    if (!mpResponse.ok) {
      console.error("Erro da API Mercado Pago:", responseData)
      const errorMessage = responseData.message || "Erro ao criar preferência no Mercado Pago."
      const errorCause = responseData.cause || []
      const details = errorCause.map((c) => `${c.code}: ${c.description}`).join("; ") || JSON.stringify(responseData)

      return NextResponse.json({ error: errorMessage, details: details }, { status: mpResponse.status || 500 })
    }

    if (!responseData.init_point) {
      console.error("init_point não encontrado na resposta da preferência (Direct Fetch):", responseData)
      throw new Error("Não foi possível obter a URL de checkout do Mercado Pago.")
    }

    return NextResponse.json({
      id: responseData.id,
      init_point: responseData.init_point,
    })
  } catch (error) {
    console.error("--------------------------------------------------")
    console.error("ERRO GERAL NA API create-preference (Direct Fetch):")
    console.error("Error Name:", error.name)
    console.error("Error Message:", error.message)
    console.error("Error Stack:", error.stack)
    if (error.cause) {
      console.error("Fetch Error Cause:", error.cause)
    }
    console.error("--------------------------------------------------")

    return NextResponse.json(
      { error: "Falha interna ao processar a solicitação de pagamento.", details: error.message },
      { status: 500 },
    )
  }
}
