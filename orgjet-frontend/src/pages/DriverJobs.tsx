import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type DriverJob = {
  id: string;
  title: string;
  description?: string;
  currentStatus: string;
  priority: string;
  company?: string | null;
  type?: { name: string } | null;
  assignments?: { user: { id: string; name: string } }[];
  updatedAt?: string;
};

export default function DriverJobs() {
  const [jobs, setJobs] = useState<DriverJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/requests/driver/my-jobs');
      setJobs(res.data.items || []);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await api.post(`/requests/driver/${id}/status`, { status });
      await loadJobs();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading driver jobs…</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-4">
        <div className="text-red-600 text-sm mb-3">{errorMsg}</div>
        <button className="border rounded px-3 py-2" onClick={loadJobs}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">My Jobs</h1>
        <p className="text-sm text-gray-600">Requests currently assigned to you.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white border rounded p-4 text-sm text-gray-600">
          No assigned jobs right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border rounded p-4 space-y-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{job.title}</h2>
                  <div className="text-sm text-gray-600">
                    {job.type?.name ?? 'Request'} • {job.priority} • {job.currentStatus}
                    {job.company ? <> • {job.company}</> : null}
                  </div>
                </div>

                <Link
                  to={`/requests/${job.id}`}
                  className="text-sm px-3 py-2 rounded border hover:bg-gray-50"
                >
                  Open
                </Link>
              </div>

              {job.description ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(job.id, 'EN_ROUTE_PICKUP')}
                  disabled={busyId === job.id}
                  className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                >
                  Start Pickup
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus(job.id, 'PICKED_UP')}
                  disabled={busyId === job.id}
                  className="px-3 py-2 rounded bg-amber-600 text-white disabled:opacity-50"
                >
                  Picked Up
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus(job.id, 'EN_ROUTE_DROPOFF')}
                  disabled={busyId === job.id}
                  className="px-3 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
                >
                  En Route Dropoff
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus(job.id, 'DELIVERED')}
                  disabled={busyId === job.id}
                  className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                >
                  Delivered
                </button>
              </div>

              {job.updatedAt ? (
                <div className="text-xs text-gray-500">
                  Last updated: {new Date(job.updatedAt).toLocaleString()}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}