import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "./context/SidebarContext";
import RequestsSidebar from "./components/RequestsSidebar";

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
      <body className="antialiased light">
        <SidebarProvider>
          <Navbar />
          <RequestsSidebar />
          <main>{children}</main>
        </SidebarProvider>
      </body>
    </html>
  );
}
