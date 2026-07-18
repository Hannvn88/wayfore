import React from "react";

/*
  AutomationSheet
  ----------------
  The large parchment overlay that opens when a card in the automations stack is
  clicked. It reads like a case file: a title block up top, then a horizontal
  flowchart walking left-to-right through the automation's stages — what
  happens, never how it's built. Each stage is drawn as a proper flowchart shape
  (pill terminators, a process rectangle, a decision diamond) joined by
  right-angled connector traces, so it reads as a real technical diagram.

  Styled to sit inside the current Wayforé site: Augustus for the automation
  title (matching the section headings), New York for the stage tags and body,
  and the site's flat parchment background, so it reads as the same surface as
  the rest of the page.

  Usage: pass the `file` object that was clicked (or null when nothing is open)
  and an `onClose` handler. Each file may carry a `flow` array of
  { stage, label, detail } steps.
*/

export default function AutomationSheet({
  file,          // the automation object clicked, or null when closed
  onClose,       // called on backdrop click, close button, or Escape key
}) {
  const open = Boolean(file);

  // Close on Escape, regardless of what has focus inside the sheet.
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Keep the diagram mounted for one extra tick after close so the
  // exit transition can play, instead of the sheet just vanishing.
  const [mounted, setMounted] = React.useState(open);
  React.useEffect(() => {
    if (open) setMounted(true);
    else {
      const t = setTimeout(() => setMounted(false), 320);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  const accent = file?.accent ?? "#4A463D";
  const flow = file?.flow ?? [];

  // Map each stage to its flowchart shape. Standard convention: terminators
  // (start/end) are pills, a process is a rectangle, a decision/action is a
  // diamond. The OUTPUT terminator carries an extra ring so it reads as the
  // end of the flow, not another start.
  const SHAPE = {
    TRIGGER: "trigger",
    PROCESS: "process",
    ACTION: "action",
    OUTPUT: "output",
  };

  return (
    <div
      className={`as-backdrop ${open ? "as-open" : ""}`}
      // Clicking the dimmed backdrop closes the sheet; clicking inside the
      // panel itself should not (handled by stopPropagation on the panel).
      onClick={onClose}
      aria-hidden={!open}
    >
      <style>{`
        /* Fonts (Augustus / NewYork) come from the site's global @font-face
           rules; the flat paper + ink palette matches the rest of the page. */
        .as-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(20, 18, 14, 0);
          backdrop-filter: blur(0px);
          transition: background .32s ease, backdrop-filter .32s ease;
          pointer-events: none;
        }
        .as-backdrop.as-open {
          background: rgba(20, 18, 14, .5);
          backdrop-filter: blur(2px);
          pointer-events: auto;
        }

        /* The sheet: a large, near-full-screen parchment overlay centred with a
           thin margin so the dimmed page still shows around it. */
        .as-panel {
          position: relative;
          width: 90vw;
          height: 90vh;
          max-width: 1180px;
          background: #F3F1EA;
          border: 1px solid rgba(20, 18, 14, .14);
          border-radius: 16px;
          box-shadow: 0 40px 120px rgba(20, 18, 14, .42);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(16px) scale(.985);
          transition: transform .34s cubic-bezier(.2,.9,.3,1), opacity .28s ease;
        }
        .as-open .as-panel {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* Full-bleed on mobile */
        @media (max-width: 640px) {
          .as-panel {
            width: 100%;
            height: 100%;
            max-width: none;
            border-radius: 0;
            border: none;
          }
        }

        .as-close {
          position: absolute;
          top: 20px;
          right: 22px;
          z-index: 3;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid rgba(20, 18, 14, .22);
          background: rgba(255, 255, 255, .5);
          color: #14120E;
          font: 400 15px/1 'NewYork', Georgia, "Times New Roman", serif;
          cursor: pointer;
        }
        .as-close:hover { background: rgba(255, 255, 255, .8); }

        /* Scrolling content region inside the fixed-size panel */
        .as-body {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: clamp(28px, 4.5vw, 56px);
        }

        .as-head { flex: none; padding-right: 48px; }

        .as-eyebrow {
          font: 400 11px/1 'NewYork', Georgia, "Times New Roman", serif;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: #4A463D;
          opacity: .7;
          margin: 0 0 12px;
        }

        .as-title {
          font-family: 'Augustus', 'Times New Roman', Georgia, serif;
          font-weight: 400;
          font-size: clamp(26px, 4vw, 38px);
          line-height: 1.1;
          letter-spacing: .01em;
          color: #14120E;
          margin: 0 0 10px;
        }

        .as-summary {
          font: 400 clamp(15px, 1.5vw, 17px)/1.55 'NewYork', Georgia, "Times New Roman", serif;
          color: #1E1B16;
          margin: 0;
          max-width: 52ch;
        }

        /* Diagram area: fills the space under the header and centres the row. */
        .as-flow-wrap {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          margin-top: clamp(20px, 3vw, 40px);
        }

        /* Horizontal flowchart. Scrolls sideways when it outgrows the panel. */
        .as-flow {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 30px 6px 34px;
          scrollbar-width: thin;
          scrollbar-color: rgba(20,18,14,.28) transparent;
          -webkit-overflow-scrolling: touch;
        }
        @media (min-width: 1000px) {
          /* On wide screens the four stages fit — centre them. */
          .as-flow { justify-content: center; }
        }
        .as-flow::-webkit-scrollbar { height: 6px; }
        .as-flow::-webkit-scrollbar-thumb {
          background: rgba(20,18,14,.24);
          border-radius: 3px;
        }

        /* A stage node: entrance-animated wrapper around the shape. */
        .as-node {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity .34s ease, transform .34s ease;
          /* transition-delay set inline per node for the stagger */
        }
        .as-open .as-node { opacity: 1; transform: translateY(0); }

        /* The drawn shape holding the text. */
        .as-shape {
          box-sizing: border-box;
          width: 178px;
          min-height: 152px;
          padding: 20px 22px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
          background: #F5F3EC;
          border: 1.4px solid rgba(20, 18, 14, .55);
        }

        /* TRIGGER — start terminator: a stadium/pill */
        .as-trigger .as-shape { border-radius: 999px; }

        /* PROCESS — a plain rectangle */
        .as-process .as-shape { border-radius: 6px; }

        /* OUTPUT — end terminator: a pill with a double ring + heavier line */
        .as-output .as-shape {
          border-radius: 999px;
          border-width: 2px;
          box-shadow: 0 0 0 3px #F3F1EA, 0 0 0 4.4px rgba(20, 18, 14, .55);
        }

        /* ACTION — decision point: a diamond. The outer shape is rotated 45°;
           the inner text block counter-rotates so the copy stays upright. */
        .as-node.as-action { width: 244px; }
        .as-action .as-shape {
          width: 172px;
          height: 172px;
          min-height: 0;
          padding: 0;
          border-radius: 10px;
          transform: rotate(45deg);
        }
        .as-action .as-shape-inner {
          transform: rotate(-45deg);
          max-width: 118px;
          margin: 0 auto;
        }

        .as-stage {
          font: 400 10.5px/1 'NewYork', Georgia, "Times New Roman", serif;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--accent);
          margin: 0 0 8px;
        }
        .as-label {
          font: 400 15px/1.28 'NewYork', Georgia, "Times New Roman", serif;
          color: #14120E;
          margin: 0 0 5px;
        }
        .as-detail {
          font: 400 12px/1.42 'NewYork', Georgia, "Times New Roman", serif;
          color: #4A463D;
          margin: 0;
        }
        .as-action .as-label { font-size: 14px; }
        .as-action .as-detail { font-size: 11px; line-height: 1.34; }

        /* Right-angled connector between two stages: a dashed schematic trace
           with a vertical end-cap pin and a small arrowhead at the join. */
        .as-conn {
          flex: none;
          width: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          opacity: 0;
          transition: opacity .3s ease;
        }
        .as-open .as-conn { opacity: .85; }
        .as-conn svg { display: block; overflow: visible; }

        .as-scrollhint {
          display: none;
          text-align: center;
          margin: 6px 0 0;
          font: 400 11px/1 'NewYork', Georgia, "Times New Roman", serif;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #4A463D;
          opacity: .6;
        }
        @media (max-width: 900px) {
          .as-flow { justify-content: flex-start; }
          .as-scrollhint { display: block; }
        }

        /* Corner stamp — decorative, keeps the "case file" feel. */
        .as-stamp {
          position: absolute;
          bottom: 24px;
          right: 28px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 1.5px solid var(--accent);
          opacity: .26;
          transform: rotate(-14deg);
          display: grid;
          place-items: center;
          font: 400 8px/1.2 'NewYork', Georgia, "Times New Roman", serif;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: var(--accent);
          text-align: center;
          pointer-events: none;
        }
        @media (max-width: 640px) { .as-stamp { display: none; } }

        @media (prefers-reduced-motion: reduce) {
          .as-backdrop, .as-panel, .as-node, .as-conn { transition: none; }
        }
      `}</style>

      <div
        className="as-panel"
        style={{ "--accent": accent }}
        role="dialog"
        aria-modal="true"
        aria-label={file ? `${file.title} automation details` : undefined}
        onClick={(e) => e.stopPropagation()} // don't let panel clicks bubble to the backdrop's onClose
      >
        <button className="as-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="as-body">
          <div className="as-head">
            <p className="as-eyebrow">Automation file</p>
            <h2 className="as-title">{file?.title}</h2>
            {file?.summary && <p className="as-summary">{file.summary}</p>}
          </div>

          {flow.length > 0 && (
            <div className="as-flow-wrap">
              <div className="as-flow" role="list">
                {flow.map((step, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div className="as-conn" aria-hidden="true">
                        <svg width="46" height="28" viewBox="0 0 46 28" fill="none">
                          {/* dashed trace */}
                          <line x1="4" y1="14" x2="37" y2="14" stroke="currentColor" strokeWidth="1.3" strokeDasharray="4 4" />
                          {/* vertical end-cap pin (right-angle) */}
                          <line x1="4" y1="9" x2="4" y2="19" stroke="currentColor" strokeWidth="1.3" />
                          {/* arrowhead */}
                          <path d="M35 8.5 L44 14 L35 19.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <div
                      className={`as-node as-${SHAPE[step.stage] ?? "process"}`}
                      role="listitem"
                      // Staggered entrance: each node appears after the last
                      style={{ transitionDelay: open ? `${140 + i * 110}ms` : "0ms" }}
                    >
                      <div className="as-shape">
                        <div className="as-shape-inner">
                          <p className="as-stage">{step.stage}</p>
                          <p className="as-label">{step.label}</p>
                          {step.detail && <p className="as-detail">{step.detail}</p>}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <p className="as-scrollhint">Swipe to follow the flow &rarr;</p>
            </div>
          )}
        </div>

        <div className="as-stamp">On file</div>
      </div>
    </div>
  );
}
