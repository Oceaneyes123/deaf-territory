import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deaf Territory',
  description: 'Accessible map and barangay lookup shell',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
