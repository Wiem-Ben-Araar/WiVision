import type { Metadata } from 'next'
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/use-auth";
import ClientLayout from  "@/components/ClientLayout";

export const metadata: Metadata = {
  title: 'Votre App',
  description: 'Description de votre application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body 
        className="min-h-screen bg-background" 
        suppressHydrationWarning={true}
      >
        <ClientLayout>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <AuthProvider>
              <Navbar />
              <main 
                className="container mx-auto px-4 py-6"
                suppressHydrationWarning={true}
              >
                {children}
              </main>
            </AuthProvider>
          </ThemeProvider>
        </ClientLayout>
      </body>
    </html>
  );
}