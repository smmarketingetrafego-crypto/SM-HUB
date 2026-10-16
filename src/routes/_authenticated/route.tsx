import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context }) => {
    // Simulando checagem de sessão
    const isAuthenticated = true;
    if (!isAuthenticated) {
      throw redirect({
        to: '/auth',
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-gray-800 p-4">
        <h1 className="text-gold font-bold text-xl mb-8">SM Hub</h1>
        <nav className="flex flex-col gap-2">
          {/* Menu Items */}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
