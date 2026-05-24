import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeafFlow Shop",
  description: "Ornamental plants — buyer storefront",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
