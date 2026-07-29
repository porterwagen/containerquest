import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Container Quest — Mission Control",
  description:
    "A miniature production platform in five languages, built to make Docker and Kubernetes visible.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-field min-h-screen antialiased">{children}</body>
    </html>
  );
}
