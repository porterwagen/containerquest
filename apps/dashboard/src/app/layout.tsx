import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Container Quest",
  description:
    "Learn Docker and Kubernetes by running a real eight-container system and breaking it on purpose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-field min-h-screen antialiased">{children}</body>
    </html>
  );
}
