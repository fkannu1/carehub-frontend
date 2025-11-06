import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">404</h1>
      <p className="mb-4 text-gray-600">Page not found.</p>
      <Link to="/" className="underline">Go home</Link>
    </div>
  );
}
