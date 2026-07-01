import { Home } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-100 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold text-primary">
        <Home className="h-7 w-7" />
        Rent & Flatmate Finder
      </Link>
      {children}
    </div>
  );
}
