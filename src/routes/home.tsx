import { Link } from "react-router";

export default function HomePage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">The Next Klopp</h1>
      <p className="mt-4 text-base">
        Learn football from A to Z, one short lesson at a time, with Premier League examples.
      </p>
      {import.meta.env.DEV ? (
        <p className="mt-4">
          <Link to="/dev" className="inline-flex min-h-11 items-center underline">
            Dev routes
          </Link>
        </p>
      ) : null}
    </main>
  );
}
