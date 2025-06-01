import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const { paymentId, userId } = await request.json()

    console.log("=== Validando Pagamento no Mercado Pago ===")
    console.log("Payment ID:", paymentId)
    console.log("User ID:", userId)

    if (!paymentId) {
      return NextResponse.json(
        {
          valid: false,
          error: "Payment ID é obrigatório",
        },
        { status: 400 },
      )
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
      console.error("Token do Mercado Pago não configurado")
      return NextResponse.json(
        {
          valid: false,
          error: "Configuração do servidor incompleta",
          details: "Token do Mercado Pago não encontrado",
        },
        { status: 500 },
      )
    }

    // Buscar pagamento no Mercado Pago
    console.log("Consultando Mercado Pago...")
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    })

    console.log("Status da resposta do MP:", paymentResponse.status)

    if (!paymentResponse.ok) {
      if (paymentResponse.status === 404) {
        return NextResponse.json({
          valid: false,
          message: "❌ Pagamento não encontrado",
          details: "Este ID de pagamento não existe no Mercado Pago",
          error: "PAYMENT_NOT_FOUND",
        })
      }

      if (paymentResponse.status === 401) {
        return NextResponse.json({
          valid: false,
          message: "❌ Erro de autenticação",
          details: "Problema na configuração do servidor",
          error: "AUTHENTICATION_ERROR",
        })
      }

      return NextResponse.json({
        valid: false,
        message: "❌ Erro ao consultar pagamento",
        details: `Erro ${paymentResponse.status} do Mercado Pago`,
        error: "MP_API_ERROR",
      })
    }

    const paymentData = await paymentResponse.json()
    console.log("Dados do pagamento:", {
      id: paymentData.id,
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      external_reference: paymentData.external_reference,
      payment_method: paymentData.payment_method_id,
    })

    // Validações do pagamento
    if (paymentData.status !== "approved") {
      return NextResponse.json({
        valid: false,
        message: `❌ Pagamento não aprovado`,
        details: `Status atual: ${paymentData.status}. Apenas pagamentos aprovados podem ser utilizados.`,
        error: "PAYMENT_NOT_APPROVED",
        paymentData: {
          status: paymentData.status,
          amount: paymentData.transaction_amount,
        },
      })
    }

    // Verificar se o external_reference bate com o userId (se existir)
    if (paymentData.external_reference && paymentData.external_reference !== userId) {
      console.log("🚨 External reference não confere:", {
        expected: userId,
        received: paymentData.external_reference,
      })
      return NextResponse.json({
        valid: false,
        message: "🚨 Este pagamento não pertence à sua conta",
        details: "O pagamento foi feito por outra pessoa ou conta",
        error: "PAYMENT_USER_MISMATCH",
      })
    }

    // Verificar valor mínimo (opcional)
    if (paymentData.transaction_amount < 9.9) {
      return NextResponse.json({
        valid: false,
        message: "❌ Valor do pagamento insuficiente",
        details: `Valor pago: R$ ${paymentData.transaction_amount}. Valor mínimo: R$ 9,90`,
        error: "INSUFFICIENT_AMOUNT",
      })
    }

    // ✅ Pagamento válido!
    console.log("✅ Pagamento válido e aprovado")

    return NextResponse.json({
      valid: true,
      message: "✅ Pagamento válido e aprovado",
      status: paymentData.status,
      amount: paymentData.transaction_amount,
      currency: paymentData.currency_id,
      paymentMethod: paymentData.payment_method_id,
      paymentData: {
        id: paymentData.id,
        status: paymentData.status,
        transaction_amount: paymentData.transaction_amount,
        currency_id: paymentData.currency_id,
        payment_method_id: paymentData.payment_method_id,
        external_reference: paymentData.external_reference,
        date_created: paymentData.date_created,
        date_approved: paymentData.date_approved,
      },
    })
  } catch (error) {
    console.error("Erro na validação do pagamento:", error)

    return NextResponse.json(
      {
        valid: false,
        message: "❌ Erro interno na validação",
        details: "Erro de conexão ou processamento",
        error: "INTERNAL_ERROR",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "API de validação de pagamento funcionando",
    timestamp: new Date().toISOString(),
    env: {
      hasToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    },
  })
}
