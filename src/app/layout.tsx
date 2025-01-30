import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'SNU Hangout',
  description: 'Your campus, your community, your vibe',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="min-h-screen bg-background font-cabinet-grotesk antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
