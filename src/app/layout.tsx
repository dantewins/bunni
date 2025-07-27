import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
// import { AuthContextProvider } from "@/context/AuthContext";

const manrope = Manrope({
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bunni",
  description: "Bunni seamlessly connects to your Notion workspace and automatically pulls in assignments, assessments, and deadlines into a clean weekly and monthly calendar—highlighting today’s events so you never miss a deadline.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className={`${manrope.className} antialiased`}>
        {/* <AuthContextProvider> */}
        {children}
        {/* </AuthContextProvider> */}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}