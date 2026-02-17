import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BambooHR Clone",
  description: "HR platform starter with employee, leave, and payroll modules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
