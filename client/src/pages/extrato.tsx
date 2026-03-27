import { MainNavigation } from '@/components/main-navigation';

export default function ExtratoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MainNavigation />
      <main className="h-[calc(100vh-4rem)] w-full">
        <iframe
          title="Extrato"
          src="/extrato.html"
          className="h-full w-full border-0"
        />
      </main>
    </div>
  );
}
