import { Link } from "react-router";

export default function DevPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-semibold">Dev</h1>
      <p className="mt-4 text-base">
        Routes under /dev are for agents and drafts, and they are left out of the study build.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-6">
        <li>
          <Link to="/dev/pitch" className="inline-flex min-h-11 items-center underline">
            Pitch Standard
          </Link>
        </li>
        <li>
          <Link to="/dev/directions" className="inline-flex min-h-11 items-center underline">
            Visual directions
          </Link>
        </li>
        <li>
          <Link to="/dev/gallery" className="inline-flex min-h-11 items-center underline">
            Component gallery
          </Link>
        </li>
      </ul>
      <p className="mt-4">
        <Link to="/" className="inline-flex min-h-11 items-center underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
