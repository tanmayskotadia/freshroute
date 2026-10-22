import {
  ArrowRight,
  Check,
  FlaskConical,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function Welcome({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="welcome-page">
      <section className="welcome-story">
        <a className="brand" href="/welcome">
          <span className="brand-icon">
            <Leaf size={30} />
          </span>
          <span>
            FreshRoute
            <span className="brand-sub">LESS WASTE. MORE POSSIBILITY.</span>
          </span>
        </a>
        <div className="welcome-copy">
          <span className="eyebrow">A FRESH PERSPECTIVE ON FOOD RESCUE</span>
          <h1>
            Good food.
            <br />
            Better decisions.
            <br />
            <span>More possibilities.</span>
          </h1>
          <p>
            When a shipment takes an unexpected turn, find a thoughtful way
            forward. Explore practical choices before making your next move.
          </p>
          <div className="welcome-journey">
            <span>
              <MapPin size={16} />
              Observe
            </span>
            <ArrowRight size={14} />
            <span>
              <FlaskConical size={16} />
              Simulate
            </span>
            <ArrowRight size={14} />
            <span>
              <Check size={16} />
              Decide
            </span>
          </div>
        </div>
        <div className="welcome-foot">
          <Leaf size={17} />
          <span>Built around one idea: every shipment matters.</span>
        </div>
        <div className="welcome-orbit" aria-hidden="true">
          <Leaf size={240} />
        </div>
      </section>
      <section className="welcome-entry">
        <div className="welcome-entry-inner">
          <span className="badge blue">
            <span className="dot" />
            Phase 3 · calculated local workspace
          </span>
          <h2>See the possibilities.</h2>
          <p>
            Step into a fictional distributor workspace and follow a shipment
            from incident to decision.
          </p>
          <div className="entry-preview">
            <span className="produce-icon large">🍅</span>
            <div>
              <strong>Start with shipment FR-101</strong>
              <small>Tomatoes · 500 kg · Ahmedabad demo</small>
            </div>
          </div>
          <ul className="check-list">
            <li>
              <Check size={17} />
              Explore the shipment control center
            </li>
            <li>
              <Check size={17} />
              Calculate and compare feasible rescue options
            </li>
            <li>
              <Check size={17} />
              Save an analysis and review a calculated local plan
            </li>
          </ul>
          <button className="button" onClick={onEnter}>
            Enter demo workspace <ArrowRight size={17} />
          </button>
          <div className="entry-boundary">
            <ShieldCheck size={18} />
            <p>
              No account or password needed. This local preview uses fictional
              data saved in this browser. Live authentication and AWS
              integrations arrive in later phases.
            </p>
          </div>
          <div className="welcome-ai-note">
            <Sparkles size={16} />
            <span>
              Explanations use calculated results; live LLM integration comes
              later.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
