import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Building2, Upload, FileText, LayoutDashboard } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vacancy Tracker",
  description: "Weekly vacancy report tracker for mobile home parks",
};

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Report", icon: Upload },
  { href: "/reports", label: "Report History", icon: FileText },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {/* Top nav */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <span className="font-bold text-gray-900 text-lg">Vacancy Tracker</span>
                </Link>
                <nav className="flex items-center gap-1">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
