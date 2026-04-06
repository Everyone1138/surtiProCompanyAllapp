import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function DriverJobs() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  function loadJobs() {
    api.get('/requests/driver/my-jobs')
      .then(res => setJobs(res.data))
      .catch(console.error);
  }

  function updateStatus(id: string, status: string) {
    api.post(`/requests/driver/${id}/status`, { status })
      .then(loadJobs)
      .catch(console.error);
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">My Jobs</h1>

      {jobs.map(job => (
        <div key={job.id} className="border p-4 mb-3 rounded">
          <h2 className="font-semibold">{job.title}</h2>
          <p className="text-sm text-gray-500">
            {job.pickupAddress1} → {job.dropoffAddress1}
          </p>
          <p>Status: {job.currentStatus}</p>

          <div className="mt-2 flex gap-2">
            <button onClick={() => updateStatus(job.id, 'EN_ROUTE_PICKUP')}>
              Start Pickup
            </button>

            <button onClick={() => updateStatus(job.id, 'PICKED_UP')}>
              Picked Up
            </button>

            <button onClick={() => updateStatus(job.id, 'DELIVERED')}>
              Delivered
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}