import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata = {
  title: "وظائف Rabbit Mart",
  description: "بوابة التقديم على وظائف Rabbit Mart",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/brand/round-mark.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full font-[var(--font-cairo)] bg-[var(--cream)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
