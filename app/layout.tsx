import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Daily Practice', description: 'A little time, every day. Simple habits in 5–15 minutes.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
