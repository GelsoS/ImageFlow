import { createClient } from "@supabase/supabase-js"

// Usar as variáveis de ambiente do Next.js em vez do Vite
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbtmghjhobultmwyqxbh.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidG1naGpob2J1bHRtd3lxeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDY5MjAsImV4cCI6MjA2MzU4MjkyMH0.PMsyugNBFGtF4w0wl6pA0bFFa5Epo__sV1aNZjUR6_s"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
