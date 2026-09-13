import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider';

const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Test Portal — Professional Online Assessment Platform',
  description:
    'Distraction-free, mobile and desktop friendly assessment portal with bcrypt token authentication and real-time exam engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
        <ConvexClientProvider>
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}


