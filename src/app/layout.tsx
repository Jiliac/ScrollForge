import type { Metadata } from "next";
import { Amiri, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SignOutButton } from "./sign-out-button";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tales of the Golden Age",
  description: "An RPG set in 11th century Islamic Persia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${amiri.variable} ${geistMono.variable} antialiased font-[family-name:var(--font-amiri)]`}
      >
        <SignOutButton />
        {children}
      </body>
    </html>
  );
}
