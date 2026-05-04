import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listUsers, searchRequests } from '../lib/api';

type UserOption = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

type RequestItem = {
  id: string;
  title?: string;
  description?: string | null;
  company?: string | null;
  companyId?: string | null;
  currentStatus?: string | null;
  priority?: string | null;
  type?: { name?: string | null } | null;
  team?: { name?: string | null } | null;
  assignee?: { id: string; name?: string | null } | null;
  assignments?: { user?: { id: string; name?: string | null } | null }[];
  updatedAt?: string | null;
};

const STATUS_OPTIONS = [
  'NEW',
  'ASSIGNED',
  'DISASSEMBLE',
  'PURCHASES',
  'EN_ROUTE_PICKUP',
  'PICKED_UP',
  'EN_ROUTE_DROPOFF',
  'DELIVERED',
  'ISSUE',
  'CANCELLED',
];

function label(value?: string | null) {
  return (value || 'UNKNOWN').replace(/_/g, ' ');
}

export default function JobSearch() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [items, setItems] = useState<RequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    listUsers()
      .then((res) => {
        setUsers(Array.isArray(res?.users) ? res.users : []);
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
        setUsers([]);
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await searchRequests({
          q: q || undefined,
          status: status || undefined,
          assigneeId: assigneeId || undefined,
          page: 1,
          pageSize: 50,
        });

        setItems(Array.isArray(res?.items) ? res.items : []);
        setTotal(Number(res?.total || 0));
      } catch (e: any) {
        console.error('Failed to search jobs:', e);
        setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to search jobs');
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [q, status, assigneeId]);

  function clearFilters() {
    setQ('');
    setStatus('');
    setAssigneeId('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Job Search</h1>
        <p className="text-sm text-gray-600">
          Search by title, company, description, request type, team, assignee, status, or metadata.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Search</label>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, company, description, assignee..."
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Assignee</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Anyone</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email || u.id} {u.role ? `— ${u.role}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        {loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {items.map((job) => {
          const assignedNames =
            job.assignments
              ?.map((a) => a.user?.name)
              .filter(Boolean)
              .join(', ') ||
            job.assignee?.name ||
            'Unassigned';

          return (
            <Link
              key={job.id}
              to={`/requests/${job.id}`}
              className="block bg-white border rounded-lg p-4 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{job.title || 'Untitled job'}</h2>
                  <div className="text-sm text-gray-600 mt-1">
                    {job.type?.name || 'Request'} • {job.priority || 'MEDIUM'} • {label(job.currentStatus)}
                    {job.company ? <> • {job.company}</> : null}
                    {job.companyId ? <> • ID: {job.companyId}</> : null}
                  </div>
                </div>

                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {job.updatedAt ? new Date(job.updatedAt).toLocaleString() : ''}
                </div>
              </div>

              {job.description ? (
                <p className="mt-3 text-sm text-gray-700 line-clamp-3">
                  {job.description}
                </p>
              ) : null}

              <div className="mt-3 text-xs text-gray-500">
                Assigned: {assignedNames}
                {job.team?.name ? <> • Team: {job.team.name}</> : null}
              </div>
            </Link>
          );
        })}

        {!loading && items.length === 0 && (
          <div className="bg-white border rounded-lg p-4 text-sm text-gray-500">
            No jobs matched your search.
          </div>
        )}
      </div>
    </div>
  );
}