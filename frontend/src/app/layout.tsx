import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
export const metadata: Metadata = {
  title: "Agent Guardrail Gateway",
  description: "A security gateway between AI agents and the tools they use",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-[#05060d]">
      <body className="min-h-screen antialiased">
        <AuthProvider>
    <Navbar />
    {children}
    <Footer />
  </AuthProvider>
      </body>
    </html>
  );
}