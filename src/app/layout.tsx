import './globals.css';
import { Inter } from 'next/font/google';
import Navigation from '@/components/Navigation';
import { SessionProvider } from '@/context/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export { metadata } from './metadata';

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <Navigation />
      <main className="min-h-screen bg-background">
        {children}
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Flight Booking System. All rights reserved.
          </p>
        </div>
      </footer>
    </SessionProvider>
  );
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}