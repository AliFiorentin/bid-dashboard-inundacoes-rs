import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // As páginas leem só os JSONs da raiz de dados_convertidos; os GeoJSONs das subpastas
  // (centenas de MB) são servidos como estáticos e não devem entrar no bundle das funções.
  outputFileTracingExcludes: {
    "*": ["public/dados_convertidos/*/**", "public/**/*.png"],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
