"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Job = {
  id: string; client: string; freelancer: string; title: string; description: string; requirements: string;
  amount: string; status: number; deliverable: string; dispute_reason: string; resolution: string; deadline: number;
};

const STATUS = ["Open", "In Progress", "Submitted", "Disputed", "Completed", "Cancelled"];
const SCOLOR = ["#2563eb", "#0891b2", "#d97706", "#dc2626", "#16a34a", "#64748b"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Job | null>(null);
  const [form, setForm] = useState({ title: "", description: "", requirements: "", amount: "", deadline: "72" });
  const [deliverable, setDeliverable] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_job_count", args: [] }));
      const out: Job[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_job", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setJobs(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting…");
    try { const w = await connectWallet(); setWallet(w); setTx(`Connected · ${shortAddr(w.address!)}`); }
    catch (e: any) { setTx(`⚠ ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx(`Processing ${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("✓ Transaction confirmed"); await load(); setSelected(null);
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", color: "#0f172a" }}>
      <div style={{ background: "#0f172a", color: "#fff", padding: "0" }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>FreelanceShield</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Escrow with AI dispute resolution</div>
            </div>
          </div>
          {wallet.address ? (
            <div style={{ ...pill, background: "#1e293b", color: "#38bdf8" }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={primaryBtn}>Connect Wallet</button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px" }}>
        {tx && <div style={statusBar}>{tx}</div>}

        <div style={{ display: "flex", gap: 8, margin: "16px 0 24px" }}>
          <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Browse Jobs</button>
          <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>Post a Job</button>
        </div>

        {tab === "create" && (
          <form onSubmit={e => { e.preventDefault(); send("create_job", [form.title, form.description, form.requirements, Number(form.deadline)], BigInt(form.amount || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>Job Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inp} />
            <label style={lbl}>Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={3} style={inp} />
            <label style={lbl}>Requirements (what must be delivered)</label>
            <textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} required rows={3} style={inp} />
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}><label style={lbl}>Payment (GEN)</label><input type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required style={inp} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Deadline (hours)</label><input type="number" min="1" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required style={inp} /></div>
            </div>
            <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop: 14, width: "100%" }}>Create Job & Lock Escrow</button>
          </form>
        )}

        {tab === "browse" && !selected && (
          <div style={{ display: "grid", gap: 12 }}>
            {jobs.length === 0 && <p style={{ color: "#64748b" }}>No jobs posted yet.</p>}
            {jobs.map(j => (
              <div key={j.id} onClick={() => setSelected(j)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{j.title}</div>
                  <div style={{ color: "#2563eb", fontWeight: 600, marginTop: 4 }}>{(Number(BigInt(j.amount)) / 1e18).toFixed(2)} GEN</div>
                </div>
                <span style={{ ...pill, background: SCOLOR[j.status] + "1a", color: SCOLOR[j.status] }}>{STATUS[j.status]}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "browse" && selected && (
          <div style={card}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>← Back</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <h2 style={{ margin: 0, fontSize: 22 }}>{selected.title}</h2>
              <span style={{ ...pill, background: SCOLOR[selected.status] + "1a", color: SCOLOR[selected.status] }}>{STATUS[selected.status]}</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 14, display: "grid", gap: 8, color: "#334155" }}>
              <div><b>Amount:</b> {(Number(BigInt(selected.amount)) / 1e18).toFixed(2)} GEN</div>
              <div><b>Deadline:</b> {new Date(selected.deadline * 1000).toLocaleString()}</div>
              <div><b>Description:</b> {selected.description}</div>
              <div><b>Requirements:</b> {selected.requirements}</div>
              {selected.deliverable && <div><b>Deliverable:</b> {selected.deliverable}</div>}
              {selected.dispute_reason && <div><b>Dispute:</b> {selected.dispute_reason}</div>}
              {selected.resolution && <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 6, border: "1px solid #16a34a44" }}><b>AI Resolution:</b> {(() => { try { return JSON.parse(selected.resolution).reasoning; } catch { return selected.resolution; } })()}</div>}
            </div>

            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.status === 0 && <button onClick={() => send("accept_job", [selected.id])} disabled={loading} style={primaryBtn}>Accept Job</button>}
              {selected.status === 0 && <button onClick={() => send("cancel_job", [selected.id])} disabled={loading} style={ghostBtn}>Cancel & Refund</button>}
              {selected.status === 1 && (
                <>
                  <textarea placeholder="Describe your deliverable…" value={deliverable} onChange={e => setDeliverable(e.target.value)} rows={3} style={inp} />
                  <button onClick={() => send("submit_deliverable", [selected.id, deliverable])} disabled={loading || !deliverable} style={primaryBtn}>Submit Deliverable</button>
                </>
              )}
              {selected.status === 2 && (
                <>
                  <button onClick={() => send("approve_deliverable", [selected.id])} disabled={loading} style={{ ...primaryBtn, background: "#16a34a" }}>✓ Approve & Release Payment</button>
                  <textarea placeholder="Reason for dispute…" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2} style={inp} />
                  <button onClick={() => send("raise_dispute", [selected.id, disputeReason])} disabled={loading || !disputeReason} style={{ ...primaryBtn, background: "#dc2626" }}>✗ Raise Dispute</button>
                </>
              )}
              {selected.status === 3 && <button onClick={() => send("resolve_dispute", [selected.id])} disabled={loading} style={{ ...primaryBtn, background: "#d97706" }}>⚖ Trigger AI Arbitration</button>}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 50, textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
          Secured by GenLayer AI consensus · {shortAddr(CONTRACT_ADDRESS)}
        </footer>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
const inp: React.CSSProperties = { padding: 11, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 6 };
const lbl: React.CSSProperties = { fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 10, display: "block" };
const primaryBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const ghostBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const pill: React.CSSProperties = { padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 };
const statusBar: React.CSSProperties = { background: "#eff6ff", border: "1px solid #bfdbfe", padding: 12, borderRadius: 8, fontSize: 13, color: "#1e40af" };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "9px 18px", background: a ? "#2563eb" : "#fff", border: "1px solid " + (a ? "#2563eb" : "#e2e8f0"), borderRadius: 8, color: a ? "#fff" : "#475569", cursor: "pointer", fontWeight: 600 });
