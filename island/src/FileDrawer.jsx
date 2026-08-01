import React from "react";
import { createRoot } from "react-dom/client";
import CardSwap, { Card } from "./CardSwap.jsx";
import AutomationSheet from "./AutomationSheet.jsx";
// The island is bundled as one self-contained JS file with no <link> stylesheet
// on the page (index.html only loads assets/automations.js). Pull the component
// + island CSS in as strings and inject them at runtime, so the styles ship
// inside the bundle instead of an orphaned assets/automations.css.
import cardSwapCss from "./CardSwap.css?inline";
import islandCss from "./island.css?inline";

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.setAttribute("data-automations-island", "");
  style.textContent = `${cardSwapCss}\n${islandCss}`;
  document.head.appendChild(style);
}

/*
  Automations island
  ------------------
  The visual/interaction shell is reactbits' CardSwap (a swapping 3D card stack)
  feeding the AutomationSheet flow diagram: selecting a card opens the sheet for
  that automation. Copy is outcome-focused on purpose — it shows what each
  automation does, never the tools or exact logic behind it.
*/
const AUTOMATIONS = [
  {
    id: "booking",
    title: "AI Booking Agent",
    summary: "A WhatsApp assistant that books appointments on its own.",
    flow: [
      { stage: "TRIGGER", label: "Customer messages the business", detail: "Any WhatsApp message starts this, day or night." },
      { stage: "PROCESS", label: "Checks real-time availability", detail: "Looks at the calendar before offering a time." },
      { stage: "ACTION", label: "Confirms a slot", detail: "Books it in and holds the spot." },
      { stage: "OUTPUT", label: "Reminder sent automatically", detail: "No one has to remember to follow up." },
    ],
  },
  {
    id: "voice",
    title: "Voice Call Assistant",
    summary: "Answers incoming calls when the team can't.",
    flow: [
      { stage: "TRIGGER", label: "Call comes in after hours", detail: "Picks up when no one's at the desk." },
      { stage: "PROCESS", label: "Understands what's needed", detail: "Listens and figures out the request." },
      { stage: "ACTION", label: "Books or escalates", detail: "Handles routine requests, flags urgent ones." },
      { stage: "OUTPUT", label: "Team notified either way", detail: "Nothing falls through the cracks overnight." },
    ],
  },
  {
    id: "leads",
    title: "Lead Follow-Up",
    summary: "Reaches out to new leads before they go cold.",
    flow: [
      { stage: "TRIGGER", label: "New lead comes in", detail: "From a form, an ad, or a referral." },
      { stage: "PROCESS", label: "Personalized message drafted", detail: "Written to fit that specific lead." },
      { stage: "ACTION", label: "Sent within minutes", detail: "Speed matters more than most people think." },
      { stage: "OUTPUT", label: "Follow-up scheduled if no reply", detail: "Keeps the conversation alive without manual chasing." },
    ],
  },
  {
    id: "inventory",
    title: "Order & Inventory Sync",
    summary: "Keeps stock and records accurate the moment an order lands.",
    flow: [
      { stage: "TRIGGER", label: "Order placed", detail: "Starts the moment checkout completes." },
      { stage: "PROCESS", label: "Inventory checked and updated", detail: "Stock numbers adjust in real time." },
      { stage: "ACTION", label: "Order logged", detail: "Recorded cleanly, no manual entry." },
      { stage: "OUTPUT", label: "Owner notified", detail: "A clear summary lands in the inbox, not a spreadsheet to dig through." },
    ],
  },
  {
    id: "reviews",
    title: "Review Requests",
    summary: "Asks happy customers for a review at the right moment.",
    flow: [
      { stage: "TRIGGER", label: "Appointment or order completed", detail: "Waits until the job is actually done." },
      { stage: "PROCESS", label: "Timed to feel natural", detail: "Not sent the second something finishes." },
      { stage: "ACTION", label: "Review request sent", detail: "A short, easy ask, not a form to fill out." },
      { stage: "OUTPUT", label: "Feedback collected automatically", detail: "Reviews build up without anyone having to ask in person." },
    ],
  },
];

// Compact geometry on mobile so the whole fanned stack fits inside a phone-width
// drawer (the desktop stack is wider than a 375px viewport).
const MOBILE_MQ = "(max-width: 1000px)";

function AutomationsIsland() {
  const [openFile, setOpenFile] = React.useState(null);
  const apiRef = React.useRef(null);   // { step(dir), count } from CardSwap
  const stepRef = React.useRef(0);     // current front-card index, 0..N-1
  const openRef = React.useRef(false); // don't gate scroll while the sheet is open
  React.useEffect(() => {
    openRef.current = Boolean(openFile);
  }, [openFile]);

  const isMobile =
    typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches;

  /*
    Scroll-gate (desktop + mobile)
    ------------------------------
    The automations section fills one viewport and the page uses mandatory y
    scroll-snap. Left alone, a wheel/swipe over the card stack snaps straight to
    the next section. Instead we capture wheel/touch here and step through the
    cards, only letting the gesture reach the page (so it snaps to the
    neighbouring section) once we're at the last card scrolling down, or the
    first card scrolling up. This runs everywhere now, not just mobile — with
    autoplay off the scroll gesture is the single driver of the stack, so the
    front-card index we track here stays in sync with what's shown.

    Touch listeners are attached natively with { passive: false } — that's what
    lets preventDefault actually stop a touch scroll (React's synthetic touch
    handlers are passive and can't). Wheel and touch don't always behave the
    same, so both paths are handled explicitly.
  */
  React.useEffect(() => {
    const section = document.getElementById("automations");
    if (!section) return;

    const N = AUTOMATIONS.length;
    // Must stay >= CardSwap's doStep() animation length, or this unlocks
    // before that animation's onComplete has fired. When that happens, a new
    // step() call still increments stepRef here, but CardSwap.doStep() bails
    // out silently (its own animatingRef guard) with no visual change — so
    // the tracked index races ahead of what's actually on screen. That's
    // what caused the gate to release to page-scroll one card early, every
    // time: doStep's timeline is 0.24s (drop) overlapped with a 0.4s reflow
    // starting at 0.22s = 0.62s total, longer than the old 520ms cooldown.
    // 680ms leaves a margin above that 620ms figure for frame-timing jitter.
    const COOL = 680;       // ms lockout between steps (>= step animation)
    const STEP_TOUCH = 44;  // px of swipe per card
    const STEP_WHEEL = 90;  // wheel delta per card
    let touchY = null;
    let wheelAccum = 0;
    let cooling = false;

    const canDown = () => stepRef.current < N - 1;
    const canUp = () => stepRef.current > 0;

    const step = dir => {
      if (cooling) return false;
      if (dir > 0 ? !canDown() : !canUp()) return false;
      if (apiRef.current) apiRef.current.step(dir);
      stepRef.current += dir > 0 ? 1 : -1;
      cooling = true;
      setTimeout(() => {
        cooling = false;
      }, COOL);
      return true;
    };

    const onWheel = e => {
      if (openRef.current) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (dir > 0 ? canDown() : canUp()) {
        e.preventDefault();   // hold the page while we still have cards to show
        if (cooling) return;  // mid-step: swallow the delta, don't pile it up
        wheelAccum += e.deltaY;
        if (Math.abs(wheelAccum) >= STEP_WHEEL && step(wheelAccum > 0 ? 1 : -1)) {
          wheelAccum = 0;
        }
      } else {
        wheelAccum = 0; // at a boundary -> let the page's snap take over
      }
    };

    const onTouchStart = e => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = e => {
      if (openRef.current || touchY == null) return;
      const dy = touchY - e.touches[0].clientY; // + = swipe up = advance
      const dir = dy > 0 ? 1 : -1;
      if (dir > 0 ? canDown() : canUp()) {
        e.preventDefault();
        if (Math.abs(dy) >= STEP_TOUCH && step(dir)) {
          touchY = e.touches[0].clientY; // reset origin for the next card
        }
      }
      // else: boundary -> do not preventDefault, page scroll-snap handles it
    };
    const onTouchEnd = () => {
      touchY = null;
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: false });
    section.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchmove", onTouchMove);
      section.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const dims = isMobile
    ? { width: 288, height: 196, cardDistance: 34, verticalDistance: 40, skewAmount: 4 }
    : { width: 344, height: 232, cardDistance: 48, verticalDistance: 56, skewAmount: 5 };

  return (
    <React.Fragment>
      <CardSwap
        width={dims.width}
        height={dims.height}
        cardDistance={dims.cardDistance}
        verticalDistance={dims.verticalDistance}
        skewAmount={dims.skewAmount}
        delay={3600}
        pauseOnHover={true}
        easing="elastic"
        autoplay={false}
        apiRef={apiRef}
        onCardClick={i => setOpenFile(AUTOMATIONS[i])}
      >
        {AUTOMATIONS.map(a => (
          <Card key={a.id} customClass="auto-card">
            <span className="ac-eyebrow">Automation</span>
            <span className="ac-title">{a.title}</span>
            <span className="ac-open">Open the flow &rarr;</span>
          </Card>
        ))}
      </CardSwap>
      <AutomationSheet file={openFile} onClose={() => setOpenFile(null)} />
    </React.Fragment>
  );
}

const el = document.getElementById("automations-root");
if (el) createRoot(el).render(<AutomationsIsland />);
