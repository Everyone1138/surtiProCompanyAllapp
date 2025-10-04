import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, listUsers, addAssignees as apiAddAssignees, removeAssignee as apiRemoveAssignee } from '../lib/api';
import CameraCapture from '../components/CameraCapture';
import { useNavigate } from 'react-router-dom';
import { deleteRequest } from '../lib/api';
import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';


export default function RequestDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // comments / posts
  const [comment, setComment] = useState('');
  const [postText, setPostText] = useState('');
  const [postFiles, setPostFiles] = useState<FileList | null>(null);
  const [posting, setPosting] = useState(false);
  const [showCameraPost, setShowCameraPost] = useState(false);
  const [capturedPost, setCapturedPost] = useState<Blob[]>([]);

  // users & assignment UI
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // for legacy single-assign dropdown
  const [assigning, setAssigning] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); // multi-select

  // activity sort
  const [activitySort, setActivitySort] = useState<'desc' | 'asc' | 'attachments'>('desc');
  
  const location = useLocation();




async function handleDelete() {
  if (!id) return;
  const ok = window.confirm('Delete this request? This cannot be undone.');
  if (!ok) return;

  try {
    await deleteRequest(id);

    // Redirect somewhere you know exists:
    const fallback = '/my-work'; // or '/requests' if that route exists
    navigate(fallback, { replace: true });
  } catch (e: any) {
    alert(e?.response?.data?.message || 'Failed to delete request');
  }
}




async function refresh() {
  if (!id) return;
  setLoading(true);
  setErrorMsg(null);
  try {
    const res = await api.get(`/requests/${id}`);
    setData(res.data);
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404) {
      // request no longer exists -> go back to a safe route
      navigate('/my-work', { replace: true });
      return;
    }
    setErrorMsg(e?.response?.data?.message || e?.message || 'Failed to load request');
  } finally {
    setLoading(false);
  }
}



useEffect(() => {
  if (!id) return;
  refresh();
}, [id]);



  // Load users once (for both multi-select and legacy dropdown)
useEffect(() => {
  listUsers()
    .then((res) => {
      const arr = Array.isArray(res) ? res : (res?.items ?? []);
      setAllUsers(arr || []);
      setUsers(arr || []); // if you use users for the legacy dropdown
    })
    .catch(() => {
      setAllUsers([]);
      setUsers([]);
    });
}, []);

  // Helpers
  const eventHasAttachments = (ev: any): boolean => {
    try {
      if (ev.eventType === 'attachment_added') return true;
      if (ev.eventType === 'post') {
        const p = ev.payloadJson ? JSON.parse(ev.payloadJson) : {};
        return Array.isArray(p.attachments) && p.attachments.length > 0;
      }
    } catch {}
    return false;
  };

  const eventsSorted = useMemo(() => {
    const arr = [...(data?.events ?? [])];
    if (activitySort === 'attachments') {
      arr.sort((a: any, b: any) => {
        const ah = eventHasAttachments(a) ? 1 : 0;
        const bh = eventHasAttachments(b) ? 1 : 0;
        if (ah !== bh) return bh - ah; // attachments first
        const at = new Date(a.createdAt).getTime();
        const bt = new Date(b.createdAt).getTime();
        return bt - at; // newer first
      });
      return arr;
    }
    arr.sort((a: any, b: any) => {
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return activitySort === 'asc' ? at - bt : bt - at;
    });
    return arr;
  }, [data?.events, activitySort]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    if (!postText.trim() && (!postFiles || postFiles.length === 0) && capturedPost.length === 0) return;

    setPosting(true);
    try {
      const form = new FormData();
      if (postText.trim()) form.append('text', postText.trim());
      if (postFiles && postFiles.length > 0) {
        Array.from(postFiles).forEach((f) => form.append('files', f));
      }
      capturedPost.forEach((b, i) =>
        form.append('files', new File([b], `post-photo-${Date.now()}-${i}.jpg`, { type: 'image/jpeg' })),
      );

      await api.post(`/requests/${id}/post`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPostText('');
      setPostFiles(null);
      setCapturedPost([]);
      await refresh();
    } finally {
      setPosting(false);
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim() || !id) return;
    await api.post(`/requests/${id}/comment`, { body: comment });
    setComment('');
    await refresh();
  }

  // Legacy single-assign endpoint (backend maps it to the join table now)
  async function assignTo(assigneeId: string) {
    if (!id) return;
    setAssigning(true);
    try {
      const payload = assigneeId ? { assigneeId } : { assigneeId: null };
      await api.post(`/requests/${id}/assign`, payload);
      await refresh();
    } finally {
      setAssigning(false);
    }
  }

  // Multi-assignee actions
  const handleAddAssignees = async () => {
    if (!id || selected.length === 0) return;
    await apiAddAssignees(id, selected);
    setSelected([]);
    await refresh();
  };

  const handleRemoveAssignee = async (userId: string) => {
    if (!id) return;
    await apiRemoveAssignee(id, userId);
    await refresh();
  };

 if (loading) {
  return <div className="p-4 text-sm text-gray-600">Loading…</div>;
}
if (errorMsg) {
  return (
    <div className="p-4">
      <div className="text-red-600 text-sm mb-2">Error: {errorMsg}</div>
      <button className="border rounded px-3 py-1 text-sm" onClick={() => refresh()}>
        Retry
      </button>
    </div>
  );
}
if (!data) {
  // Loaded but nothing came back (defensive)
  return (
    <div className="p-4 text-sm text-gray-600">
      Request not found. <button className="underline" onClick={() => navigate('/my-work')}>Back to My Work</button>
    </div>
  );
}

  // Derived: names joined for list-style display if needed
  const assigneeNames = (data.assignments || [])
    .map((a: any) => a.user?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* MAIN */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-xl font-semibold">{data.title}</h2>

        <div className="text-sm text-gray-600">
          {data.type?.name} • {data.priority} • {data.currentStatus}
          {(data.company || data.companyId) && (
            <> • {data.company ?? ''}{data.company && data.companyId ? ' — ' : ''}{data.companyId ?? ''}</>
          )}
          {assigneeNames && <> • Assigned: {assigneeNames}</>}
        </div>

        <p className="bg-white p-3 rounded border whitespace-pre-wrap">{data.description}</p>

        {/* NEW POST */}
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">New Post</div>
          <form onSubmit={submitPost} className="space-y-2">
            <textarea
              className="border rounded w-full p-2"
              placeholder="Write an update..."
              rows={3}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
            />

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPostFiles(e.target.files)}
                className="text-sm"
              />

              {/* Camera modal trigger */}
              <button
                type="button"
                onClick={() => setShowCameraPost(true)}
                className="px-3 py-1.5 rounded border text-sm"
              >
                Use camera
              </button>
            </div>

            {/* Captured thumbnails */}
            {capturedPost.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {capturedPost.map((b, i) => {
                  const url = URL.createObjectURL(b);
                  return (
                    <div key={i} className="relative">
                      <img src={url} className="w-full h-24 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => setCapturedPost((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 text-xs bg-white/90 border rounded px-1"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {postFiles && postFiles.length > 0 && (
              <span className="text-xs text-gray-600">{postFiles.length} file(s) selected</span>
            )}

            <div className="flex justify-end">
              <button
                className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
                disabled={posting || (!postText.trim() && (!postFiles || postFiles.length === 0) && capturedPost.length === 0)}
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* ACTIVITY HEADER */}
        <div className="flex items-center justify-between mt-6">
          <h3 className="font-semibold">Activity</h3>
          <label className="text-sm flex items-center gap-2">
            Sort:
            <select
              value={activitySort}
              onChange={(e) => setActivitySort(e.target.value as 'asc' | 'desc' | 'attachments')}
              className="border rounded p-1 text-sm"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
              <option value="attachments">With attachments first</option>
            </select>
          </label>
        </div>

        {/* ACTIVITY FEED */}
        <div className="space-y-2">
          {eventsSorted.map((ev: any) => {
            const payload = (() => {
              try {
                return ev.payloadJson ? JSON.parse(ev.payloadJson) : {};
              } catch {
                return {};
              }
            })();
            const ts = new Date(ev.createdAt).toLocaleString();

            return (
              <div key={ev.id} className="bg-white p-2 rounded border text-sm">
                <div className="text-gray-600">
                  {ts} • {ev.actor?.name} • {ev.eventType}
                </div>

                {ev.eventType === 'comment' && payload?.body && (
                  <div className="mt-1 whitespace-pre-wrap">{payload.body}</div>
                )}

                {ev.eventType === 'assigned' && (
                  <div className="mt-1">
                    Assigned to: <span className="font-medium">{payload?.assigneeId || '—'}</span>
                  </div>
                )}

                {ev.eventType === 'created' && (
                  <div className="mt-1 text-gray-700">
                    {payload?.title ? (
                      <>
                        Title: <span className="font-medium">{payload.title}</span>
                      </>
                    ) : null}
                    {payload?.dueAt ? <> • Due: {new Date(payload.dueAt).toLocaleDateString()}</> : null}
                    {payload?.company ? <> • Company: {payload.company}</> : null}
                    {payload?.companyId ? <> • ID: {payload.companyId}</> : null}
                  </div>
                )}

                {ev.eventType === 'attachment_added' &&
                  Array.isArray(payload?.attachments) &&
                  payload.attachments.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {payload.attachments.map((a: any) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block group"
                          title={`${a.name} • ${new Date(a.createdAt).toLocaleString()}`}
                        >
                          <img
                            src={a.url}
                            className="w-full h-28 object-cover rounded border group-hover:opacity-90"
                            alt={a.name || 'attachment'}
                            loading="lazy"
                          />
                          <div className="mt-1 text-[10px] text-gray-500 truncate">{a.name}</div>
                        </a>
                      ))}
                    </div>
                  )}

                {ev.eventType === 'post' && (
                  <>
                    {payload?.text && <div className="mt-1 whitespace-pre-wrap">{payload.text}</div>}
                    {Array.isArray(payload?.attachments) && payload.attachments.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {payload.attachments.map((a: any) => (
                          <a
                            key={a.id}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block group"
                            title={`${a.name} • ${new Date(a.createdAt).toLocaleString()}`}
                          >
                            <img
                              src={a.url}
                              className="w-full h-28 object-cover rounded border group-hover:opacity-90"
                              alt={a.name || 'post image'}
                              loading="lazy"
                            />
                            <div className="mt-1 text-[10px] text-gray-500 truncate">{a.name}</div>
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!['comment', 'assigned', 'created', 'attachment_added', 'post'].includes(ev.eventType) && (
                  <pre className="text-xs mt-1">{JSON.stringify(payload, null, 2)}</pre>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SIDEBAR */}
      <div className="space-y-3">
        {/* Multi-assignee chips + picker */}
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Assignees</div>

          <div className="flex flex-wrap gap-2 mb-3">
            {(data.assignments || []).map((a: any) => (
              <span key={a.user.id} className="px-2 py-1 rounded bg-gray-100 text-sm">
                {a.user.name}
                <button
                  className="ml-2 text-red-600 hover:underline text-xs"
                  onClick={() => handleRemoveAssignee(a.user.id)}
                  title="Remove"
                  type="button"
                >
                  ×
                </button>
              </span>
            ))}
            {!data.assignments?.length && <span className="text-sm text-gray-500">Unassigned</span>}
          </div>

          <div className="mt-1 flex items-start gap-2">
<select
  multiple
  className="border rounded p-2 min-w-[260px] h-28"
  value={selected}
  onChange={(e) => {
    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
    setSelected(vals);
  }}
>
  {(Array.isArray(allUsers) ? allUsers : []).map((u: any) => (
    <option key={u.id} value={u.id}>
      {u.name}
    </option>
  ))}
</select>

            <button onClick={handleAddAssignees} className="px-3 py-2 rounded bg-blue-600 text-white" type="button">
              Add Assignees
            </button>
          </div>
        </div>

        {/* Legacy single-assign block (still works; writes to join table via backend) */}
        <div className="bg-white rounded border p-3">
          <div className="font-semibold mb-2">Status & Single Assignment</div>
          <div className="text-sm text-gray-700 mb-2">
            Current assignee: <strong>{data.assignee?.name ?? '—'}</strong>
          </div>
<div className="bg-white rounded border p-3">
  <div className="font-semibold mb-2">Danger Zone</div>
  <button
    onClick={handleDelete}
    className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
    type="button"
  >
    Delete Request
  </button>
  <div className="text-xs text-gray-500 mt-2">
    Only admins/coordinators or the request creator can delete.
  </div>
</div>
          <label className="block text-sm text-gray-600 mb-1">Assign to</label>
          <select
            className="border rounded w-full p-2"
            value={data.assignee?.id ?? ''}
            onChange={(e) => assignTo(e.target.value)}
            disabled={assigning}
          >
            <option value="">— Unassigned —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {assigning && <div className="text-xs text-gray-500 mt-2">Assigning…</div>}
        </div>
      </div>

      {/* Camera modal (if you use one) */}
      {showCameraPost && (
        <CameraCapture
          onClose={() => setShowCameraPost(false)}
          onCapture={(blob) => setCapturedPost((prev) => [...prev, blob])}
        />
      )}
    </div>
  );
}
