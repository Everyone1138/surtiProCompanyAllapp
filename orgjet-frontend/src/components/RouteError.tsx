import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export default function RouteError() {
  const error = useRouteError() as any;

  let title = 'Something went wrong';
  let message = 'Unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = (error.data && (error.data.message || error.data)) || 'The page may be missing.';
  } else if (error?.message) {
    message = error.message;
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      <div className="flex gap-2">
        <Link to="/" className="px-3 py-2 rounded border">Home</Link>
        <Link to="/my-work" className="px-3 py-2 rounded border">My Work</Link>
        <Link to="/requests" className="px-3 py-2 rounded border">All Requests</Link>
      </div>
    </div>
  );
}