import { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getJobs } from '../api/jobs';
import { scheduleInterview, listSlots, deleteSlot } from '../api/calendar';

export default function CalendarPage() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Form states
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [dateTime, setDateTime] = useState('');

  useEffect(() => {
    getJobs()
      .then((res) => {
        setJobs(res.data);
        if (res.data.length > 0) {
          setSelectedJobId(res.data[0].id);
        }
      })
      .catch(() => toast.error('Failed to load jobs'))
      .finally(() => setLoadingJobs(false));
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;
    loadSlots(selectedJobId);
  }, [selectedJobId]);

  const loadSlots = (jobId) => {
    setLoadingSlots(true);
    listSlots(jobId)
      .then((res) => setSlots(res.data))
      .catch(() => toast.error('Failed to load calendar slots'))
      .finally(() => setLoadingSlots(false));
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!selectedJobId || !candidateName.trim() || !candidateEmail.trim() || !dateTime) {
      toast.error('Please fill in all fields');
      return;
    }

    setScheduling(true);
    const payload = {
      job_id: selectedJobId,
      candidate_name: candidateName.trim(),
      candidate_email: candidateEmail.trim(),
      scheduled_time: new Date(dateTime).toISOString(),
    };

    try {
      await scheduleInterview(payload);
      toast.success('Interview scheduled! Invitation email sent.');
      setCandidateName('');
      setCandidateEmail('');
      setDateTime('');
      loadSlots(selectedJobId);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule interview');
    } finally {
      setScheduling(false);
    }
  };

  const handleDelete = async (slotId) => {
    if (!window.confirm('Are you sure you want to cancel this interview?')) return;
    try {
      await deleteSlot(slotId);
      toast.success('Interview cancelled successfully');
      loadSlots(selectedJobId);
    } catch (err) {
      toast.error('Failed to cancel slot');
    }
  };

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loadingJobs) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-deep-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="mono-label mb-2">Calendar</p>
          <h1 className="font-display text-section-heading text-primary mb-2">
            Interview Scheduler
          </h1>
          <p className="text-body text-body-muted max-w-lg">
            Schedule candidate AI interview slots, send email invitations, and manage upcoming evaluations.
          </p>
        </div>

        {/* Job Selector */}
        {jobs.length > 0 && (
          <div className="flex flex-col gap-1.5 min-w-[240px]">
            <label className="text-micro text-muted font-medium uppercase tracking-wider">
              Select Position
            </label>
            <select
              className="input-field py-2.5 text-sm"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {job.company ? `(${job.company})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="card text-center py-12">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-medium text-ink mb-1">No jobs available</h3>
          <p className="text-caption text-muted">Please create a job description before scheduling interviews.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Schedule Form */}
          <div className="lg:col-span-5">
            <div className="card">
              <h2 className="heading-feature mb-6 flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-deep-green" /> Schedule Slot
              </h2>
              <form onSubmit={handleSchedule} className="space-y-4">
                <div>
                  <label className="label-form mb-1">Candidate Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-muted" />
                    <input
                      type="text"
                      className="input-field pl-11"
                      placeholder="e.g. Alice Smith"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-form mb-1">Candidate Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-muted" />
                    <input
                      type="email"
                      className="input-field pl-11"
                      placeholder="e.g. alice@example.com"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label-form mb-1">Interview Date & Time</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={scheduling}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2"
                >
                  {scheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Schedule & Send Invite
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Slots List */}
          <div className="lg:col-span-7">
            <div className="card p-0">
              <div className="px-6 py-5 border-b border-hairline flex items-center justify-between">
                <h2 className="heading-feature flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-deep-green" /> Upcoming Interviews
                </h2>
                <span className="text-micro text-muted bg-soft-stone rounded-full px-2.5 py-0.5 border border-hairline">
                  {slots.length} scheduled
                </span>
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-deep-green animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-16 px-6">
                  <Calendar className="w-8 h-8 text-muted mx-auto mb-3 opacity-60" />
                  <p className="text-body text-muted">No scheduled interviews found for this job position.</p>
                </div>
              ) : (
                <div className="divide-y divide-hairline">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-soft-stone/10 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-ink truncate block">
                            {slot.candidate_name}
                          </span>
                          <span className="badge-success text-micro rounded-full px-2 py-0.5">
                            {slot.status}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-caption text-muted mt-1.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> {slot.candidate_email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {formatTime(slot.scheduled_time)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="btn-ghost text-muted hover:text-error self-start sm:self-center p-2 rounded-sm"
                        title="Cancel Interview"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
