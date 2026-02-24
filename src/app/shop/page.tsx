import { Nav } from "@/components/ui/Nav";

export default function ShopPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-[var(--font-playfair)] text-4xl text-[#C9A84C] mb-4">Shop</h1>
          <p className="font-[var(--font-jetbrains)] text-sm text-[#e8e0d0] opacity-50 tracking-widest uppercase">
            Coming soon
          </p>
        </div>
      </main>
    </>
  );
}
