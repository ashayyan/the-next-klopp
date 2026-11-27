import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-4">
        <Link to="/" className="underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
