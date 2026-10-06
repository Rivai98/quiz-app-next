import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata:Metadata = {
  title: "اختباراتك | وتحدَّ نفسك",
  description: "منصة اختبارات سريعة وتفاعلية",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>
        <a className="skip-link" href="#main">انتقل إلى المحتوى</a>
        {children}
      </body>
    </html>
  );
}
