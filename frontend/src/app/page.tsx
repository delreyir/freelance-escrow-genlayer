"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Job = { id: string; client: string; freelancer: string; title: string; description: string; requirements: string; amount: string; status: number; deliverable: string; dispute_reason: string; resolution: string; deadline: number; };
const STATUS = ["Open", "In Progress", "Submitted", "Disputed", "Completed", "Cancelled"];
const SCOLOR = ["#2563eb", "#0891b2", "#d97706", "#dc2626", "#16a34a", "#64748b"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [nav, setNav] = useState<"dashboard" | "browse" | "create">("dashboard");
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
      for (let i = 1; i <= count; i++) { const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_job", args: [String(i)] }); out.push(JSON.parse(raw as string)); }
      setJobs(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() { setTx("Connecting…"); try { const w = await connectWallet(); setWallet(w); setTx(""); } catch (e: any) { setTx(e.message); } }
  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("Connect wallet first"); return; }
    setLoading(true); setTx(`${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      const _rcpt: any = await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 5000 });
      const _st = String((_rcpt && (_rcpt.statusName ?? _rcpt.status)) || "").toUpperCase();
      if (_st && _st !== "ACCEPTED" && _st !== "FINALIZED") throw new Error(/UNDETERMINED|TIMEOUT|NO_MAJORITY|DISAGREE/.test(_st) ? "AI validators could not reach consensus — no funds were moved. Please try again." : ("Transaction did not complete (" + _st + ")."));
      setTx(""); await load(); setSelected(null); if (nav === "create") setNav("browse");
    } catch (e: any) { setTx(e.message); }
    setLoading(false);
  }

  const stats = { open: jobs.filter(j => j.status === 0).length, active: jobs.filter(j => j.status === 1 || j.status === 2).length, done: jobs.filter(j => j.status === 4).length };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui,-apple-system,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "#0f172a", color: "#cbd5e1", padding: "22px 16px", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px 20px", borderBottom: "1px solid #1e293b" }}>
          <span style={{ fontSize: 22 }}>🛡️</span><span style={{ fontWeight: 800, color: "#fff" }}>FreelanceShield</span>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 18, flex: 1 }}>
          {([["dashboard", "▦ Dashboard"], ["browse", "≣ Browse Jobs"], ["create", "+ Post a Job"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => { setNav(k); setSelected(null); }} style={navItem(nav === k)}>{label}</button>
          ))}
        </nav>
        {/* connect at bottom of sidebar */}
        {wallet.address ? (
          <div style={{ background: "#1e293b", borderRadius: 10, padding: "10px 12px", fontSize: 12 }}>
            <div style={{ color: "#38bdf8" }}>● Connected</div>
            <div style={{ fontFamily: "monospace", color: "#94a3b8", marginTop: 2 }}>{shortAddr(wallet.address)}</div>
          </div>
        ) : (
          <button onClick={handleConnect} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "11px", cursor: "pointer", fontWeight: 600, width: "100%" }}>Connect Wallet</button>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: "28px 34px", overflowY: "auto", maxHeight: "100vh" }}>
        {tx && <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{tx}</div>}

        {nav === "dashboard" && (
          <>
            <h1 style={{ marginTop: 0 }}>Dashboard</h1>
            <div style={{ ...cardW, marginBottom: 22, borderLeft: "4px solid #2563eb" }}>
              <h3 style={{ marginTop: 0 }}>What FreelanceShield does</h3>
              <p style={{ color: "#475569", lineHeight: 1.6, marginTop: 4 }}>A freelance marketplace where the client's payment is locked in escrow up front. If the delivered work is disputed, GenLayer's AI validators read the requirements and the deliverable and decide a fair split — no middleman, no waiting weeks for support.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginTop: 12 }}>
                {[["1", "Connect wallet"], ["2", "Client posts a job & locks GEN in escrow"], ["3", "Freelancer accepts & submits the deliverable"], ["4", "Client approves → pay, or disputes → AI arbitrates the split"]].map(([n, t]) => (
                  <div key={n} style={{ background: "#f1f5f9", borderRadius: 8, padding: "10px 12px" }}>
                    <span style={{ color: "#2563eb", fontWeight: 800, fontSize: 12 }}>STEP {n}</span>
                    <div style={{ fontSize: 13, color: "#334155", marginTop: 3 }}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
              {[["Open Jobs", stats.open, "#2563eb"], ["Active", stats.active, "#d97706"], ["Completed", stats.done, "#16a34a"]].map(([l, v, c], i) => (
                <div key={i} style={{ ...cardW, borderTop: `3px solid ${c}` }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{l}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: c as string }}>{v}</div>
                </div>
              ))}
            </div>
            <h3>Recent Jobs</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {jobs.slice(0, 5).map(j => (
                <div key={j.id} onClick={() => { setNav("browse"); setSelected(j); }} style={{ ...cardW, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}>
                  <span style={{ fontWeight: 600 }}>{j.title}</span>
                  <span style={{ ...badge, background: SCOLOR[j.status] + "1a", color: SCOLOR[j.status] }}>{STATUS[j.status]}</span>
                </div>
              ))}
              {jobs.length === 0 && <p style={{ color: "#94a3b8" }}>No jobs yet.</p>}
            </div>
          </>
        )}

        {nav === "create" && (
          <>
            <h1 style={{ marginTop: 0 }}>Post a Job</h1>
            <form onSubmit={e => { e.preventDefault(); send("create_job", [form.title, form.description, form.requirements, Number(form.deadline)], BigInt(form.amount || "0") * BigInt(10 ** 18)); }} style={{ ...cardW, maxWidth: 600 }}>
              <label style={lbl}>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required style={inp} />
              <label style={lbl}>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required rows={3} style={inp} />
              <label style={lbl}>Requirements</label><textarea value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} required rows={3} style={inp} />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><label style={lbl}>Payment (GEN)</label><input type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required style={inp} /></div>
                <div style={{ flex: 1 }}><label style={lbl}>Deadline (h)</label><input type="number" min="1" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} required style={inp} /></div>
              </div>
              <button disabled={loading} style={{ ...primaryBtn, marginTop: 10 }}>Create Job & Lock Escrow</button>
            </form>
          </>
        )}

        {nav === "browse" && !selected && (
          <>
            <h1 style={{ marginTop: 0 }}>Browse Jobs</h1>
            <div style={{ display: "grid", gap: 12 }}>
              {jobs.length === 0 && <p style={{ color: "#94a3b8" }}>No jobs posted yet.</p>}
              {jobs.map(j => (
                <div key={j.id} onClick={() => setSelected(j)} style={{ ...cardW, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 16 }}>{j.title}</div><div style={{ color: "#2563eb", fontWeight: 700, marginTop: 4 }}>{(Number(BigInt(j.amount)) / 1e18).toFixed(2)} GEN</div></div>
                  <span style={{ ...badge, background: SCOLOR[j.status] + "1a", color: SCOLOR[j.status] }}>{STATUS[j.status]}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {nav === "browse" && selected && (
          <div style={{ ...cardW, maxWidth: 640 }}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>← Back</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <h2 style={{ margin: 0 }}>{selected.title}</h2>
              <span style={{ ...badge, background: SCOLOR[selected.status] + "1a", color: SCOLOR[selected.status] }}>{STATUS[selected.status]}</span>
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
              {selected.status === 1 && (<><textarea placeholder="Describe your deliverable…" value={deliverable} onChange={e => setDeliverable(e.target.value)} rows={3} style={inp} /><button onClick={() => send("submit_deliverable", [selected.id, deliverable])} disabled={loading || !deliverable} style={primaryBtn}>Submit Deliverable</button></>)}
              {selected.status === 2 && (<><button onClick={() => send("approve_deliverable", [selected.id])} disabled={loading} style={{ ...primaryBtn, background: "#16a34a" }}>✓ Approve & Release</button><textarea placeholder="Reason for dispute…" value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2} style={inp} /><button onClick={() => send("raise_dispute", [selected.id, disputeReason])} disabled={loading || !disputeReason} style={{ ...primaryBtn, background: "#dc2626" }}>✗ Raise Dispute</button></>)}
              {selected.status === 3 && <button onClick={() => send("resolve_dispute", [selected.id])} disabled={loading} style={{ ...primaryBtn, background: "#d97706" }}>⚖ Trigger AI Arbitration</button>}
            </div>
          </div>
        )}
      </main>
      <style>{`body{margin:0}`}</style>
    </div>
  );
}

const cardW: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" };
const inp: React.CSSProperties = { padding: 11, borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 6 };
const lbl: React.CSSProperties = { fontSize: 12, color: "#64748b", fontWeight: 600, marginTop: 10, display: "block" };
const primaryBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const ghostBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#64748b", fontSize: 14, cursor: "pointer", fontWeight: 600 };
const badge: React.CSSProperties = { padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 };
const navItem = (a: boolean): React.CSSProperties => ({ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: "none", background: a ? "#1e293b" : "transparent", color: a ? "#fff" : "#94a3b8", cursor: "pointer", fontSize: 14, fontWeight: 600 });
