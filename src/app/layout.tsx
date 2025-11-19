import type { Metadata } from "next";
import { AuthProvider } from "../hooks/useAuth";
import "./globals.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "HR Attendance Portal",
  description: "HR dashboard for managing PI attendance reports",
  icons: {
    icon: "favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen bg-cyan-200 text-2xl">
                Loading App...
              </div>
            }
          >
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
