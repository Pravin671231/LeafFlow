export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">LeafFlow Shop</h1>
        <button type="button" className="btn btn-primary">
          Browse plants
        </button>
      </main>
    </div>
  );
}
