import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pregador da Palavra", short_name: "Pregador", lang: "pt-BR",
    start_url: "/painel", display: "standalone",
    background_color: "#f1f3f4", theme_color: "#1e2a4a",
    // TODO: adicionar icon-192.png e icon-512.png em /public antes de publicar.
    icons: [],
  };
}
