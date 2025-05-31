import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Criar cliente Supabase com chave de serviço
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST() {
  console.log("--- Verificando assinaturas expiradas ---")

  try {
    // Buscar assinaturas ativas que expiraram
    const now = new Date().toISOString()
    const { data: expiredSubscriptions, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("status", "active")
      .lt("end_date", now)

    if (error) {
      console.error("Erro ao buscar assinaturas expiradas:", error)
      return NextResponse.json({ error: "Erro ao buscar assinaturas" }, { status: 500 })
    }

    console.log(`Encontradas ${expiredSubscriptions?.length || 0} assinaturas expiradas`)

    if (expiredSubscriptions && expiredSubscriptions.length > 0) {
      for (const subscription of expiredSubscriptions) {
        try {
          // Marcar assinatura como expirada
          await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", subscription.id)

          // Rebaixar usuário para role "user"
          await supabaseAdmin
            .from("profiles")
            .update({
              role: "user",
              subscription_status: "expired",
            })
            .eq("id", subscription.user_id)

          console.log(`Usuário ${subscription.user_id} rebaixado para 'user' - assinatura expirada`)
        } catch (updateError) {
          console.error(`Erro ao processar assinatura ${subscription.id}:`, updateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: expiredSubscriptions?.length || 0,
    })
  } catch (error) {
    console.error("Erro geral ao verificar assinaturas expiradas:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
