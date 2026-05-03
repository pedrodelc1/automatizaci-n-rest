import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { CarritoProvider } from "@/context/CarritoContext";
import "./globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Restaurante — Pedidos Online",
  description: "Hacé tu pedido online para delivery o retiro en local",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fontSans.variable} ${fontDisplay.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var d=document.documentElement;if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}})()` }} />
      </head>
      <body className="font-sans bg-neutral-50 dark:bg-neutral-950 min-h-screen">
        <CarritoProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2500,
              style: {
                borderRadius: "14px",
                fontWeight: "600",
                fontSize: "14px",
                padding: "12px 18px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
              },
              success: { style: { background: "#14532d", color: "#fff" } },
              error:   { style: { background: "#7f1d1d", color: "#fff" } },
            }}
          />
        </CarritoProvider>
      </body>
    </html>
  );
}
