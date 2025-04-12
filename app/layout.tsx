import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "./context/SidebarContext";
import RequestsSidebar from "./components/RequestsSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bartr",
  description: "A platform for skill-based trading and collaboration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased light`}
      >
        <SidebarProvider>
          <Navbar />
          <RequestsSidebar />
          <main>{children}</main>
        </SidebarProvider>
      </body>
    </html>
  );
}
