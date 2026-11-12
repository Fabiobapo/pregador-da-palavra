import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "Pregador da Palavra" };
export const viewport: Viewport = { themeColor: "#1e2a4a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, evitando flash. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem("pdp-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}` }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `if("serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js"))` }} />
      </body>
    </html>
  );
}
