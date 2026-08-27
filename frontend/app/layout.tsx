import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navbar } from '@/components/navbar';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Litigant — AI Chargeback Defense Agent',
  description:
    'AI-powered chargeback defense dashboard for merchants. Contest disputes with evidence assembled by reason code.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-secondary/30">
          <Navbar />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
