import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

type RequestCard = {
  id: string;
  title: string;
  description?: string;
  priority: string;
  currentStatus: string;
  company?: string | null;
  type?: { name: string } | null;
  assignee?: { id: string; name: string } | null;
  assignments?: { user: { id: string; name: string } }[];
};

type BoardColumn = {
  key: string;
  title: string;
  items: RequestCard[];
};

export default function Board() {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadBoard() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.get('/board');
      setColumns(res.data.columns || []);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading dispatch board…</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-4">
        <div className="text-red-600 text-sm mb-3">{errorMsg}</div>
        <button className="border rounded px-3 py-2" onClick={loadBoard}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dispatch Board</h1>
        <p className="text-sm text-gray-600">Requests grouped by current status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className="bg-gray-50 border rounded-lg p-3 min-h-[240px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-700">
                {col.title}
              </h2>
              <span className="text-xs bg-white border rounded px-2 py-1 text-gray-600">
                {col.items.length}
              </span>
            </div>

            <div className="space-y-3">
              {col.items.length === 0 ? (
                <div className="text-sm text-gray-400">No requests</div>
              ) : (
                col.items.map((card) => {
                  const assignedNames =
                    card.assignments?.map((a) => a.user?.name).filter(Boolean).join(', ') ||
                    card.assignee?.name ||
                    'Unassigned';

                  return (
                    <Link
                      key={card.id}
                      to={`/requests/${card.id}`}
                      className="block bg-white border rounded p-3 hover:shadow-sm transition"
                    >
                      <div className="font-medium text-sm mb-1">{card.title}</div>

                      <div className="text-xs text-gray-600 mb-2">
                        {card.type?.name ?? 'Request'} • {card.priority}
                        {card.company ? <> • {card.company}</> : null}
                      </div>

                      {card.description ? (
                        <div className="text-sm text-gray-700 line-clamp-3 mb-2">
                          {card.description}
                        </div>
                      ) : null}

                      <div className="text-xs text-gray-500">
                        Assigned: {assignedNames}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}