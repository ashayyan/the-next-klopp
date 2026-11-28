import { Link } from "react-router";

export default function DevPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Dev</h1>
      <p className="mt-4 text-base">
        Routes under /dev are for agents and drafts, and they are left out of the study build.
      </p>
      <ul className="mt-4 list-disc pl-6">
        <li>
          <Link to="/dev/pitch" className="underline">
            Pitch Standard
          </Link>
        </li>
      </ul>
      <p className="mt-4">
        <Link to="/" className="underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
