import { NextResponse } from "next/server"

// Armazenar logs em memória (em produção, use um banco de dados)
let webhookLogs = []

export async function POST(request) {
  try {
    const logData = await request.json()

    // Adicionar timestamp
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...logData,
    }

    // Manter apenas os últimos 50 logs
    webhookLogs.unshift(logEntry)
    if (webhookLogs.length > 50) {
      webhookLogs = webhookLogs.slice(0, 50)
    }

    console.log("Log webhook adicionado:", logEntry)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao adicionar log:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    logs: webhookLogs,
    count: webhookLogs.length,
  })
}
