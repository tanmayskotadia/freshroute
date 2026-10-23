import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, X } from "lucide-react";

export function PresentationMode({ shipmentId, runId, cloud, onNavigate, onClose }: {
  shipmentId?: string; runId?: string; cloud: boolean;
  onNavigate: (path: string) => void; onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const steps = [
    { title: "The incident", seconds: 45, path: shipmentId ? `/shipments/${shipmentId}` : "/shipments", note: "Explain the delay, entered temperature history and quantity at risk. These are fictional shipment inputs." },
    { title: "Calculate the alternatives", seconds: 85, path: shipmentId ? `/rescue/${shipmentId}` : "/shipments", note: "Change one assumption. Compare feasible destinations, quality, cost and expected loss. Hard constraints are checked before ranking." },
    { title: "Preserve the decision", seconds: 60, path: "/history", note: "Save a calculated analysis first. Show its frozen inputs and source signature; later edits do not rewrite the saved calculation." },
    { title: "Explain with AI", seconds: 60, path: runId ? `/runs/${runId}` : "/history", note: cloud ? "Open a saved analysis and ask the AI to explain its calculated options. Review a draft before applying it; the AI cannot reserve capacity." : "Live AI needs AWS sign-in. Explain the cloud flow using the evidence screen; do not present local calculations as a live model response." },
    { title: "Make it operational", seconds: 70, path: "/fulfilment", note: cloud ? "Show an existing reservation, capacity ledger and private report. New reservations require explicit operator approval; delivery and food safety are not guaranteed." : "Cloud fulfilment requires sign-in. Discuss transactional capacity checks, asynchronous reports and notification status using the evidence screen." },
    { title: "Prove the architecture", seconds: 70, path: "/evidence", note: "Show retained services, dated test results and deleted lab experiments. Explain retries, encryption, ownership, alarms and the approved HTTPS hosting fallback." },
    { title: "Value and limitations", seconds: 30, path: "/evidence", note: "Close with a practical decision-support use case. State that the quality model is illustrative, expensive labs are deleted, and some syllabus topics are studies." },
  ];
  useEffect(() => {
    document.body.classList.add("presenting");
    return () => document.body.classList.remove("presenting");
  }, []);
  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const base = elapsed;
    const timer = window.setInterval(() => setElapsed(base + Math.floor((Date.now() - start) / 1000)), 250);
    return () => window.clearInterval(timer);
    // Capture elapsed only when the clock starts or resumes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const current = steps[step];
  const move = (next: number) => { setStep(next); onNavigate(steps[next].path); };
  return <section className="presentation-guide" aria-label="Seven-minute presentation guide">
    <div className="presentation-heading">
      <span className="presentation-count">{String(step + 1).padStart(2, "0")} / 07</span>
      <div><strong>{current.title}</strong><small>{current.seconds} second segment · {cloud ? "AWS workspace" : "Local demo"}</small></div>
      <button className="text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? "Hide notes" : "Show notes"}</button>
      <button className="icon-button" aria-label="Exit presentation mode" onClick={onClose}><X size={18}/></button>
    </div>
    {expanded && <p className="presentation-notes">{current.note}</p>}
    <div className="presentation-controls">
      <button className="icon-button" disabled={step === 0} aria-label="Previous segment" onClick={() => move(step - 1)}><ArrowLeft size={18}/></button>
      <button className="text-button" onClick={() => onNavigate(current.path)}>Open screen</button>
      <button className="icon-button" disabled={step === 6} aria-label="Next segment" onClick={() => move(step + 1)}><ArrowRight size={18}/></button>
      <span className={elapsed > 420 ? "presentation-clock overtime" : "presentation-clock"} aria-label="Elapsed presentation time">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} / 7:00</span>
      <button className="icon-button" aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning(!running)}>{running ? <Pause size={18}/> : <Play size={18}/>}</button>
      <button className="icon-button" aria-label="Reset presentation timer" onClick={() => { setRunning(false); setElapsed(0); }}><RotateCcw size={17}/></button>
    </div>
    <progress aria-label="Presentation segments completed" value={step + 1} max={7}/>
  </section>;
}
