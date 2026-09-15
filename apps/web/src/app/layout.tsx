import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CampusFlow — AI Campus Issue Resolution',
  description: 'Report campus issues, track resolutions, and get AI-powered assistance for all your campus needs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
