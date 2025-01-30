import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

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
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
