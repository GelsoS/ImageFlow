/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbtmghjhobultmwyqxbh.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidG1naGpob2J1bHRtd3lxeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDY5MjAsImV4cCI6MjA2MzU4MjkyMH0.PMsyugNBFGtF4w0wl6pA0bFFa5Epo__sV1aNZjUR6_s",
    NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY || "APP_USR-2f97e286-aac2-41ec-8919-b3241d75ac73",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://leiloescarros.com", // Use a URL da sua aplicação em produção
    MERCADO_PAGO_ACCESS_TOKEN:
      process.env.MERCADO_PAGO_ACCESS_TOKEN ||
      "APP_USR-7230223279813284-052515-6e7a6442e97f296383aafcffd15cddea-140587207",
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
