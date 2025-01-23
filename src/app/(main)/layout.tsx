import { MobileNav } from "@/components/shared/mobile-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-16">
      <main className="mobile-container py-4">{children}</main>
      <MobileNav />
    </div>
  );
} 