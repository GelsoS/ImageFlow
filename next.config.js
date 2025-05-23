/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://cbtmghjhobultmwyqxbh.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidG1naGpob2J1bHRtd3lxeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMDY5MjAsImV4cCI6MjA2MzU4MjkyMH0.PMsyugNBFGtF4w0wl6pA0bFFa5Epo__sV1aNZjUR6_s",
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
