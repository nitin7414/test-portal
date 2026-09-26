import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SmoothScrollProvider } from '@/components/providers/SmoothScrollProvider';
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider';
import { OfflineMonitor } from '@/components/network/OfflineMonitor';

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

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
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-[#F8FAFC] text-slate-900 font-sans"
      >
        <ConvexClientProvider>
          <OfflineMonitor />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}


