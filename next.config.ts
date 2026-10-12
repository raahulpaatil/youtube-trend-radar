import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // The Gemini instruction lives in prompts/ and is read at runtime, so ship it with the functions.
  outputFileTracingIncludes: {
    "/api/**/*": ["./prompts/**/*"],
  },
};

export default nextConfig;
