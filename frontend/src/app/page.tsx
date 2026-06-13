"use client";

import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Job = {
  id: string;
  client: string;
  freelancer: string;
  title: string;
  description: string;
  requirements: string;
  amount: string;
  status: number;
  deliverable: string;
  dispute_reason: string;
  resolution: string;
  created_at: number;
};

const STATUS_LABELS = ["Open", "In Progress", "Submitted", "Disputed", "Completed", "Cancelled"];
const STATUS_COLORS = ["#4caf50", "#2196f3", "#ff9800", "#f44336", "#9c27b0", "#757575"];

export default function Home() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [form, setForm] = useState({ title: "", description: "", requirements: "", amount: "", deadline: "72" });
  const [deliverable, setDeliverable] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [txStatus, setTxStatus] = useState("");

  useEffect(() => {
    if (CONTRACT_ADDRESS) loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const countResult = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_job_count",
        args: [],
      });
      const count = Number(countResult);
      const loaded: Job[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "get_job",
          args: [String(i)],
        });
        loaded.push(JSON.parse(raw as string));
      }
      setJobs(loaded);
    } catch (e) {
      console.error("Failed to load jobs:", e);
    }
  }

  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTxStatus("Creating job...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "create_job",
        args: [form.title, form.description, form.requirements, Number(form.deadline)],
        value: BigInt(form.amount) * BigInt(10 ** 18),
      });
      setTxStatus(`Tx sent: ${txHash}. Waiting for confirmation...`);
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Job created!");
      setForm({ title: "", description: "", requirements: "", amount: "", deadline: "72" });
      await loadJobs();
      setTab("browse");
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleAcceptJob(jobId: string) {
    setLoading(true);
    setTxStatus("Accepting job...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "accept_job",
        args: [jobId],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Job accepted!");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleSubmitDeliverable(jobId: string) {
    setLoading(true);
    setTxStatus("Submitting deliverable...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "submit_deliverable",
        args: [jobId, deliverable],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Deliverable submitted!");
      setDeliverable("");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleApprove(jobId: string) {
    setLoading(true);
    setTxStatus("Approving deliverable...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "approve_deliverable",
        args: [jobId],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Approved! Payment released.");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleDispute(jobId: string) {
    setLoading(true);
    setTxStatus("Raising dispute...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "raise_dispute",
        args: [jobId, disputeReason],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Dispute raised!");
      setDisputeReason("");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleResolveDispute(jobId: string) {
    setLoading(true);
    setTxStatus("AI Arbitration in progress... (this may take a moment)");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "resolve_dispute",
        args: [jobId],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Dispute resolved by AI!");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleCancelJob(jobId: string) {
    setLoading(true);
    setTxStatus("Cancelling job...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "cancel_job",
        args: [jobId],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Job cancelled, escrow refunded!");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleClaimExpired(jobId: string) {
    setLoading(true);
    setTxStatus("Claiming expired job...");
    try {
      const txHash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "claim_expired",
        args: [jobId],
      });
      await client.waitForTransactionReceipt({ hash: txHash });
      setTxStatus("Expired job claimed, escrow refunded!");
      await loadJobs();
      setSelectedJob(null);
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function handleRate(jobId: string, score: number) {
    setLoading(true);
    setTxStatus("Submitting rating...");
    try {
      // Try rating as client first, then as freelancer
      try {
        const txHash = await client.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "rate_freelancer",
          args: [jobId, score],
        });
        await client.waitForTransactionReceipt({ hash: txHash });
      } catch {
        const txHash = await client.writeContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          functionName: "rate_client",
          args: [jobId, score],
        });
        await client.waitForTransactionReceipt({ hash: txHash });
      }
      setTxStatus(`Rated ${score}/5 ⭐`);
      await loadJobs();
    } catch (e: any) {
      setTxStatus(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center", marginBottom: 8 }}>⚖️ Freelance Escrow</h1>
      <p style={{ textAlign: "center", color: "#888", marginBottom: 32 }}>
        AI-Powered Arbitration on GenLayer
      </p>

      {txStatus && (
        <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {txStatus}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => { setTab("browse"); setSelectedJob(null); }}
          style={{ padding: "10px 20px", background: tab === "browse" ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}
        >
          Browse Jobs
        </button>
        <button
          onClick={() => { setTab("create"); setSelectedJob(null); }}
          style={{ padding: "10px 20px", background: tab === "create" ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}
        >
          Post a Job
        </button>
      </div>

      {/* Create Job Form */}
      {tab === "create" && (
        <form onSubmit={handleCreateJob} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Job Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            style={inputStyle}
          />
          <textarea
            placeholder="Job Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            rows={3}
            style={inputStyle}
          />
          <textarea
            placeholder="Requirements (what the freelancer must deliver)"
            value={form.requirements}
            onChange={(e) => setForm({ ...form, requirements: e.target.value })}
            required
            rows={3}
            style={inputStyle}
          />
          <input
            placeholder="Payment Amount (GEN)"
            type="number"
            min="1"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
            style={inputStyle}
          />
          <input
            placeholder="Deadline (hours)"
            type="number"
            min="1"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "Processing..." : "Create Job & Lock Escrow"}
          </button>
        </form>
      )}

      {/* Job List */}
      {tab === "browse" && !selectedJob && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.length === 0 && <p style={{ color: "#888" }}>No jobs yet. Create one!</p>}
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, cursor: "pointer", border: "1px solid #333" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{job.title}</h3>
                <span style={{ background: STATUS_COLORS[job.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>
                  {STATUS_LABELS[job.status]}
                </span>
              </div>
              <p style={{ color: "#aaa", margin: "8px 0 0" }}>
                {(Number(BigInt(job.amount)) / 1e18).toFixed(2)} GEN
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Job Detail */}
      {tab === "browse" && selectedJob && (
        <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <button onClick={() => setSelectedJob(null)} style={{ background: "none", border: "none", color: "#6c5ce7", cursor: "pointer", marginBottom: 16 }}>
            ← Back
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>{selectedJob.title}</h2>
            <span style={{ background: STATUS_COLORS[selectedJob.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>
              {STATUS_LABELS[selectedJob.status]}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 8, fontSize: 14 }}>
            <div><strong>Client:</strong> {selectedJob.client.slice(0, 10)}...</div>
            <div><strong>Freelancer:</strong> {selectedJob.freelancer || "None yet"}</div>
            <div><strong>Amount:</strong> {(Number(BigInt(selectedJob.amount)) / 1e18).toFixed(2)} GEN</div>
            <div><strong>Deadline:</strong> {new Date((selectedJob as any).deadline * 1000).toLocaleString()}</div>
            <div><strong>Description:</strong> {selectedJob.description}</div>
            <div><strong>Requirements:</strong> {selectedJob.requirements}</div>
            {selectedJob.deliverable && <div><strong>Deliverable:</strong> {selectedJob.deliverable}</div>}
            {selectedJob.dispute_reason && <div><strong>Dispute:</strong> {selectedJob.dispute_reason}</div>}
            {selectedJob.resolution && <div><strong>Resolution:</strong> {selectedJob.resolution}</div>}
          </div>

          {/* Actions based on status */}
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedJob.status === 0 && (
              <button onClick={() => handleAcceptJob(selectedJob.id)} disabled={loading} style={btnStyle}>
                Accept Job
              </button>
            )}

            {selectedJob.status === 1 && (
              <>
                <textarea
                  placeholder="Describe your deliverable..."
                  value={deliverable}
                  onChange={(e) => setDeliverable(e.target.value)}
                  rows={3}
                  style={inputStyle}
                />
                <button onClick={() => handleSubmitDeliverable(selectedJob.id)} disabled={loading || !deliverable} style={btnStyle}>
                  Submit Deliverable
                </button>
              </>
            )}

            {selectedJob.status === 2 && (
              <>
                <button onClick={() => handleApprove(selectedJob.id)} disabled={loading} style={{ ...btnStyle, background: "#4caf50" }}>
                  ✓ Approve & Release Payment
                </button>
                <textarea
                  placeholder="Reason for dispute..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={2}
                  style={inputStyle}
                />
                <button onClick={() => handleDispute(selectedJob.id)} disabled={loading || !disputeReason} style={{ ...btnStyle, background: "#f44336" }}>
                  ✗ Raise Dispute
                </button>
              </>
            )}

            {selectedJob.status === 3 && (
              <button onClick={() => handleResolveDispute(selectedJob.id)} disabled={loading} style={{ ...btnStyle, background: "#ff9800" }}>
                ⚖️ Trigger AI Arbitration
              </button>
            )}

            {selectedJob.status === 0 && (
              <button onClick={() => handleCancelJob(selectedJob.id)} disabled={loading} style={{ ...btnStyle, background: "#757575" }}>
                Cancel Job & Refund
              </button>
            )}

            {selectedJob.status === 1 && (
              <button onClick={() => handleClaimExpired(selectedJob.id)} disabled={loading} style={{ ...btnStyle, background: "#757575" }}>
                ⏰ Claim Expired (if deadline passed)
              </button>
            )}

            {selectedJob.status === 4 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span>Rate (1-5): </span>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => handleRate(selectedJob.id, s)} disabled={loading} style={{ ...btnStyle, padding: "8px 12px", background: "#ffc107" }}>
                    {"⭐".repeat(s)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#1a1a2e",
  color: "#e0e0e0",
  fontSize: 14,
};

const btnStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 8,
  border: "none",
  background: "#6c5ce7",
  color: "#fff",
  fontSize: 14,
  cursor: "pointer",
  fontWeight: "bold",
};
