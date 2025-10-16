import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Import the provider
import AppShell from "@/components/AppShell"; // App shell handles header visibility

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Healtara",
  description: "Your Doctor Appointment Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider> {/* Wrap children with the provider */}
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}