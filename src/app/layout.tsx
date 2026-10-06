import type { Metadata } from "next";
import "./globals.css";

export const metadata:Metadata={title:"نبض | اختبارات عربية ذكية",description:"اختبارات عربية سريعة مع إنشاء الأسئلة بالذكاء الاصطناعي",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ar" dir="rtl"><body><a className="skip-link" href="#main">انتقل إلى المحتوى</a>{children}</body></html>}
