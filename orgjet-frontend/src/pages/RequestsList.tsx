import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type RequestItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  currentStatus: string;
  dueAt?: string | null;
  company?: string | null;
  companyId?: string | null;
  type?: { name?: string };
  team?: { name?: string };
  assignments?: { user: { id: string; name: string } }[];
  updatedAt?: string;
};

export default function RequestsList() {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // simple filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [type, setType] = useState<string>('');
  const [team, setTeam] = useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (status) params.status = status; // CSV supported by backend
      if (type) params.type = type;
      if (team) params.team = team;
      const res = await api.get('/requests', { params });
      setItems(res.data.items || res.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Search</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="title or description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Status</label>
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="NEW">NEW</option>
            <option value="TRIAGE">TRIAGE</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="REVIEW">REVIEW</option>
            <option value="DONE">DONE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Type (name)</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="e.g. Maintenance"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Team (name)</label>
          <input
            className="border rounded px-2 py-1"
            placeholder="e.g. Ops"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          />
        </div>

        <button className="px-3 py-2 rounded bg-black text-white" onClick={load}>
          Apply
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-sm text-gray-500">No requests found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((r) => {
            const names =
              (r.assignments || [])
                .map((a) => a.user?.name)
                .filter(Boolean)
                .join(', ') || 'Unassigned';
            const due =
              r.dueAt ? new Date(r.dueAt).toLocaleDateString() : '—';
            return (
              <Link
                to={`/requests/${r.id}`}
                key={r.id}
                className="block bg-white border rounded p-3 hover:shadow-sm transition"
              >
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {r.type?.name || 'Request'} • {r.priority} • {r.currentStatus}
                  {r.team?.name ? <> • Team: {r.team.name}</> : null}
                </div>
                {(r.company || r.companyId) && (
                  <div className="text-xs text-gray-600">
                    {r.company ?? ''}{r.company && r.companyId ? ' — ' : ''}{r.companyId ?? ''}
                  </div>
                )}
                <div className="text-sm mt-2 line-clamp-2">{r.description}</div>
                <div className="text-xs text-gray-600 mt-2">
                  Due: <span className="font-medium">{due}</span>
                </div>
                <div className="text-xs text-gray-600">
                  Assigned: <span className="font-medium">{names}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
