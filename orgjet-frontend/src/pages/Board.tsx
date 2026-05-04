import { useEffect, useMemo, useState } from 'react';
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

function prettyStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export default function Board() {
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openStatuses, setOpenStatuses] = useState<Record<string, boolean>>({});

  async function loadBoard() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.get('/board');
      const nextColumns = res.data.columns || [];
      setColumns(nextColumns);

      // First load: open statuses that have jobs, keep empty ones closed.
      setOpenStatuses((prev) => {
        if (Object.keys(prev).length > 0) return prev;

        const initial: Record<string, boolean> = {};
        nextColumns.forEach((col: BoardColumn) => {
          initial[col.key] = col.items.length > 0;
        });

        return initial;
      });
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  function toggleStatus(key: string) {
    setOpenStatuses((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    columns.forEach((col) => {
      next[col.key] = true;
    });
    setOpenStatuses(next);
  }

  function collapseAll() {
    const next: Record<string, boolean> = {};
    columns.forEach((col) => {
      next[col.key] = false;
    });
    setOpenStatuses(next);
  }

  const totalJobs = useMemo(
    () => columns.reduce((sum, col) => sum + col.items.length, 0),
    [columns],
  );

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dispatch Board</h1>
          <p className="text-sm text-gray-600">
            {totalJobs} total job{totalJobs === 1 ? '' : 's'} grouped by status.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-50"
          >
            Expand all
          </button>

          <button
            type="button"
            onClick={collapseAll}
            className="border rounded px-3 py-2 text-sm bg-white hover:bg-gray-50"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {columns.map((col) => {
          const isOpen = !!openStatuses[col.key];

          return (
            <section key={col.key} className="bg-white border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleStatus(col.key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-4">
                    {isOpen ? '▼' : '▶'}
                  </span>

                  <div>
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-800">
                      {prettyStatus(col.title || col.key)}
                    </h2>
                    <div className="text-xs text-gray-500">
                      Click to {isOpen ? 'hide' : 'show'} jobs
                    </div>
                  </div>
                </div>

                <span className="text-xs bg-gray-100 border rounded px-2 py-1 text-gray-700">
                  {col.items.length}
                </span>
              </button>

              {isOpen && (
                <div className="border-t bg-gray-50 p-3">
                  {col.items.length === 0 ? (
                    <div className="text-sm text-gray-400 bg-white border rounded p-3">
                      No jobs in this status.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {col.items.map((card) => {
                        const assignedNames =
                          card.assignments
                            ?.map((a) => a.user?.name)
                            .filter(Boolean)
                            .join(', ') ||
                          card.assignee?.name ||
                          'Unassigned';

                        return (
                          <Link
                            key={card.id}
                            to={`/requests/${card.id}`}
                            className="block bg-white border rounded p-3 hover:shadow-sm transition"
                          >
                            <div className="font-medium text-sm mb-1">
                              {card.title}
                            </div>

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
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}