import Link from "next/link";
import { Home, Search, UserPlus } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-50 via-background to-secondary-100 px-4">
      <div className="text-center animate-fade-in">
        <div className="mb-6 flex items-center justify-center gap-3 text-primary">
          <Home className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Rent & Flatmate Finder
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
          AI-powered compatibility matching to help owners find ideal tenants and tenants find their perfect home.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/login"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:w-auto">
            <Search className="h-4 w-4" /> Sign in
          </Link>
          <Link href="/register"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-6 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground sm:w-auto">
            <UserPlus className="h-4 w-4" /> Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
