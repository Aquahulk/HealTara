import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext"; // Import the provider
import { MobileProvider } from "@/context/MobileContext"; // Import mobile provider
import AppShell from "@/components/AppShell"; // App shell handles header visibility
import { RealtimeProvider } from "@/context/RealtimeContext";

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
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <AuthProvider>
          <MobileProvider>
            <RealtimeProvider>
              <AppShell>{children}</AppShell>
            </RealtimeProvider>
          </MobileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
