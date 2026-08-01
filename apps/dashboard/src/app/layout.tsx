import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Container Quest β",
  description:
    "Learn Docker and Kubernetes by running a real eight-container system and breaking it on purpose. Public beta.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="grid-field min-h-screen antialiased">{children}</body>
    </html>
  );
}
