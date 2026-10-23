import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    // Use the installed TypeScript 5 compiler API. The CLI subprocess loses
    // captured output in this execution environment; type checking stays on.
    useTypeScriptCli: false,
  },
};

export default config;
