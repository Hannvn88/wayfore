/*
  FileDrawer, Wayforé edition
  ---------------------------
  Restyled to match the Wayforé Studio site: ivory paper, ink-black
  serif titles, hairline borders, and "No." plate details like the
  ruler ticks and italic caption.

  Behavior:
  - Files stand in a line, viewed from above. No idle motion.
  - All tabs sit on the LEFT side, forming a clean column.
  - Hover / keyboard focus pops a file up with a springy motion
    and sharpens its title.
  - Scrolling while the cursor is over the drawer CYCLES the files
    (front file changes) instead of scrolling the page.

  To add a file: add one object to the array below. That's it.
    id      - unique string (React key)
    title   - text on the tab and file face
    href    - optional link. Present = the file is an <a>
    accent  - optional tab color (defaults to ink black)
*/

import { useState, useRef, useEffect, useCallback } from "react";

// ---- YOUR FILES LIVE HERE ----------------------------------
// Add / remove / reorder freely. First entry = front file.
const DEFAULT_FILES = [
  { id: "projects", title: "Projects", href: "#" },
  { id: "services", title: "Services", href: "#" },
  { id: "security", title: "Security", href: "#" },
  { id: "about",    title: "About",    href: "#" },
  { id: "contact",  title: "Contact" }, // no href yet -> uses onFileOpen
];
// ------------------------------------------------------------

export default function FileDrawer({
  files = DEFAULT_FILES,
  // Called for files WITHOUT an href. Plug in routing/modals later.
  onFileOpen = (file) => console.log("open file:", file.id),
  // Caption shown bottom-left of the plate, like the site's figures
  caption = "No. 02 · Index of files",
  // Geometry knobs
  fileWidth = 320,     // base width (px) - scaled responsively via CSS
  fileHeight = 200,    // base height (px) - scaled responsively via CSS
  spacing = 52,        // gap between files (px) - scaled responsively via CSS
  tilt = 42,           // how steeply you look down (deg)
  lean = 76,           // how far files lean back from vertical (deg)
  lift = 90,           // how far a hovered file pops up (px)
}) {
  // Total depth the row occupies, used to center the group
  const rowDepth = (files.length - 1) * spacing;

  // --- Scroll-to-cycle state -----------------------------------
  // `offset` is how many steps the drawer has been rotated. It can
  // grow/shrink without bound; we wrap it with modulo when we use it,
  // so the cycling feels continuous in either direction.
  const [offset, setOffset] = useState(0);

  // Ref to the scene element. Used to track whether the cursor is
  // over the drawer right now.
  const sceneRef = useRef(null);

  // Tracks hover state in a ref (not React state) so the window
  // wheel listener below can read it on every scroll tick without
  // needing to re-subscribe itself each time it changes.
  const isHoveringRef = useRef(false);

  // Accumulates small wheel deltas (e.g. trackpad ticks) until they
  // cross a threshold, then fires one "step" of cycling. Without
  // this, a single trackpad swipe would spin through many files at
  // once because trackpads emit dozens of tiny wheel events.
  const wheelAccumRef = useRef(0);
  const WHEEL_STEP_THRESHOLD = 60; // px of accumulated deltaY per step

  const handleWheel = useCallback((event) => {
    // Ignore entirely if the cursor isn't over the drawer — let the
    // page (or the site's section-snap) handle scrolling normally.
    if (!isHoveringRef.current) return;

    // The site has its own section-snap scrolling, which listens for
    // wheel events separately from this component. A plain
    // preventDefault()/stopPropagation() on OUR element only stops
    // the event from continuing to bubble past us — it does nothing
    // to a listener that's registered elsewhere (e.g. on the section
    // container or on window). That's why cycling worked for a
    // couple of cards and then the page/section still jumped: the
    // snap listener was seeing the same wheel event we were.
    //
    // Fix: this handler is registered on `window` in the CAPTURE
    // phase (see the addEventListener call below), so it runs before
    // any bubble-phase listener anywhere in the page — including the
    // section-snap logic. stopImmediatePropagation() then guarantees
    // no other listener for this exact event fires at all, no matter
    // where in the DOM it's attached.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    wheelAccumRef.current += event.deltaY;

    if (wheelAccumRef.current >= WHEEL_STEP_THRESHOLD) {
      // Scrolled down enough -> advance to the next file
      setOffset((prev) => prev + 1);
      wheelAccumRef.current = 0;
    } else if (wheelAccumRef.current <= -WHEEL_STEP_THRESHOLD) {
      // Scrolled up enough -> go back to the previous file
      setOffset((prev) => prev - 1);
      wheelAccumRef.current = 0;
    }
  }, []);

  useEffect(() => {
    const node = sceneRef.current;
    if (!node) return;

    // Remembers the page's own overflow setting (if any) so we can
    // restore it exactly, rather than assuming it was empty.
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    const setHovering = () => {
      isHoveringRef.current = true;
      // Belt-and-suspenders: even if some snap listener wins the
      // event race and we can't stop it from firing, the page
      // physically cannot scroll while this is set. Covers the
      // native CSS `scroll-snap-type` case in particular, since that
      // one isn't driven by a wheel listener at all — it's the
      // browser's own scroll physics, which our event interception
      // has no power over.
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    };
    const setNotHovering = () => {
      isHoveringRef.current = false;
      wheelAccumRef.current = 0; // don't carry a partial step into the next hover
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };

    // Cheap listeners just to know whether the cursor is over the
    // drawer right now — these don't need capture or passive:false.
    node.addEventListener("mouseenter", setHovering);
    node.addEventListener("mouseleave", setNotHovering);

    // The actual scroll interception happens on `window`, in the
    // capture phase, with passive:false. Capture phase = runs before
    // any bubble-phase listener (including a smooth-scroll/snap
    // library bound to window or a parent section). passive:false is
    // required or preventDefault() inside handleWheel is silently
    // ignored and the page/section would still move.
    window.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      node.removeEventListener("mouseenter", setHovering);
      node.removeEventListener("mouseleave", setNotHovering);
      window.removeEventListener("wheel", handleWheel, { capture: true });
      // Guard against unmounting mid-hover, which would otherwise
      // leave the page permanently unscrollable.
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [handleWheel]);
  // ---------------------------------------------------------------

  return (
    <div
      className="fd-scene"
      aria-label="File drawer navigation"
      ref={sceneRef}
    >
      <style>{`
        /* ---- Palette pulled from the site ----
           paper    #F5F3EE   page background
           card     #FBFAF6   file face
           ink      #1A1916   text, tabs
           hairline #D9D5CC   borders
           muted    #8A857A   captions                         */

        .fd-scene {
          position: relative;
          width: 100%;
          min-height: clamp(400px, 100vh, 600px);
          display: grid;
          place-items: center;
          perspective: 1300px;
          perspective-origin: 50% 12%;   /* eye above the drawer */
          background: #F5F3EE;
          border: 1px solid #D9D5CC;     /* hairline plate frame */
          padding: clamp(1rem, 5vw, 2rem);
          box-sizing: border-box;
          /* Tell the browser this element handles its own scroll
             gesture, so touch scrolling over it doesn't also try
             to pan the page vertically. */
          touch-action: none;
        }

        /* Ruler ticks along the top */
        .fd-scene::before {
          content: "";
          position: absolute;
          top: clamp(12px, 2vw, 16px);
          left: clamp(16px, 3vw, 24px);
          right: clamp(16px, 3vw, 24px);
          height: clamp(5px, 1vw, 8px);
          background: repeating-linear-gradient(
            90deg, #C9BEB3 0 1px, transparent 1px clamp(48px, 10vw, 64px));
          border-top: 1px solid #C9BEB3;
          pointer-events: none;
          opacity: .7;
        }

        /* Italic serif caption, bottom-left */
        .fd-caption {
          position: absolute;
          bottom: clamp(12px, 2vw, 18px);
          left: clamp(16px, 3vw, 24px);
          font: italic 400 clamp(11px, 1.8vw, 13px)/1.3 Georgia, "Times New Roman", serif;
          color: #9D9289;
          pointer-events: none;
          letter-spacing: .01em;
        }

        /* The drawer floor, tilted away from the viewer */
        .fd-drawer {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: center center;
          /* Scale responsively: 0.85x on small screens, 1x at 768px, 1x at 1280px+ */
          transform: scale(clamp(0.8, (100vw - 300px) / 400px, 1.1));
        }

        @media (max-width: 640px) {
          .fd-drawer {
            transform: scale(0.75);
          }
        }

        @media (min-width: 1280px) {
          .fd-drawer {
            transform: scale(1.05);
          }
        }

        /* One file = paper card with hairline border */
        .fd-file {
          position: absolute;
          left: 50%; top: 50%;
          display: block;
          border: 1px solid #D9D5CC;
          padding: 0;
          cursor: pointer;
          text-decoration: none;
          background: linear-gradient(135deg, #FBFAF6 0%, #F8F5ED 50%, #F3F0E8 100%);
          border-radius: 6px 6px 3px 3px;
          box-shadow: 0 2px 4px rgba(26,25,22,.08),
                      0 1px 2px rgba(26,25,22,.06),
                      inset 0 1px 0 rgba(255,255,255,.9);
          transform-style: preserve-3d;
          /* Depth-slot changes (from cycling) animate smoothly here
             too, instead of jumping instantly to the new position. */
          transition: transform .34s cubic-bezier(.34,1.6,.5,1),
                      box-shadow .34s ease;
          outline: none;
          backface-visibility: hidden;
        }

        /* Pop-out on hover AND keyboard focus */
        .fd-file:hover,
        .fd-file:focus-visible {
          transform: var(--rest)
                     translateY(calc(var(--lift) * -1))
                     translateZ(100px)
                     scale(1.04);
          box-shadow: 0 20px 40px rgba(26,25,22,.22),
                      0 8px 16px rgba(26,25,22,.12),
                      inset 0 1px 0 rgba(255,255,255,.9);
          z-index: 999;
        }

        .fd-file:focus-visible {
          outline: 2px solid #1A1916; /* keyboard focus ring */
          outline-offset: 3px;
        }

        /* Tab: ink black, ivory text, ALL on the left side */
        .fd-tab {
          position: absolute;
          top: clamp(-30px, -8vw, -27px);
          left: clamp(12px, 3vw, 18px);
          height: clamp(24px, 6vw, 30px);
          padding: 0 clamp(12px, 2.5vw, 16px);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px 4px 0 0;
          font: 700 clamp(9px, 1.5vw, 11px)/1.2 ui-sans-serif, system-ui, sans-serif;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #F5F3EE;
          white-space: nowrap;
          box-shadow: 0 1px 3px rgba(26,25,22,.12);
          transition: all .3s ease;
        }

        .fd-file:hover .fd-tab,
        .fd-file:focus-visible .fd-tab {
          box-shadow: 0 2px 6px rgba(26,25,22,.16);
        }

        /* Removed title text on file face for clean look */
        .fd-title {
          display: none;
        }

        /* Small No. number on each file */
        .fd-No {
          position: absolute;
          bottom: clamp(10px, 2vw, 14px);
          left: clamp(12px, 2.5vw, 16px);
          font: italic 400 clamp(10px, 1.5vw, 12px)/1.4 Georgia, "Times New Roman", serif;
          color: #A39F94;
          letter-spacing: .02em;
        }

        /* Respect reduced-motion users */
        @media (prefers-reduced-motion: reduce) {
          .fd-file, .fd-tab { transition: none; }
        }

        /* Mobile optimization */
        @media (max-width: 768px) {
          .fd-scene {
            min-height: 450px;
            perspective: 900px;
          }

          .fd-file {
            border-radius: 5px 5px 2px 2px;
          }
        }

        /* Tablet and up */
        @media (min-width: 1024px) {
          .fd-scene {
            min-height: 550px;
            perspective: 1500px;
          }

          .fd-file {
            border-radius: 6px 6px 3px 3px;
          }
        }
      `}</style>

      <div
        className="fd-drawer"
        style={{
          width: fileWidth,
          height: rowDepth + fileHeight,
          transform: `rotateX(${tilt}deg)`, // tips the drawer floor away
        }}
      >
        {files.map((file, i) => {
          // Each file's ORIGINAL index is `i` (stable React key,
          // stable identity). Its DISPLAY position (front-to-back
          // slot) is what changes as the user scrolls. We compute
          // that by shifting `i` by the current offset and wrapping
          // it into [0, files.length) with modulo, so files cycle
          // around the loop instead of running off the end.
          const displayIndex =
            ((i - offset) % files.length + files.length) % files.length;

          // Depth slot: displayIndex = 0 is the FRONT file (closest
          // to viewer). This is the only line that changed from
          // "i" to "displayIndex" to make cycling work.
          const depthPos = rowDepth / 2 - displayIndex * spacing;

          /*
            Resting transform, stored in --rest so the hover rule can
            reuse it and only add the lift + scale on top.
              1. center on its slot
              2. slide to its depth slot on the floor
              3. stand it up, leaning back slightly
          */
          const rest = `translate(-50%, -50%) translateY(${depthPos}px) rotateX(-${lean}deg)`;

          const common = {
            className: "fd-file",
            style: {
              width: fileWidth,
              height: fileHeight,
              transform: rest,
              "--rest": rest,
              "--lift": `${lift}px`,
              // Stacking now follows displayIndex too, so the file
              // that is visually in front also sits on top.
              zIndex: files.length - displayIndex,
            },
            children: (
              <>
                <span
                  className="fd-tab"
                  style={{ background: file.accent ?? "#1A1916" }}
                >
                  {file.title}
                </span>
                <span className="fd-title">{file.title}</span>
                {/* Shows the file's current position in the stack,
                    e.g. the front file always reads "No. 01" even
                    as different files rotate into that slot. */}
                <span className="fd-No">
                  No. {String(displayIndex + 1).padStart(2, "0")}
                </span>
              </>
            ),
          };

          // Files with an href are real links, the rest are buttons
          return file.href ? (
            <a key={file.id} href={file.href} {...common} />
          ) : (
            <button
              key={file.id}
              type="button"
              onClick={() => onFileOpen(file)}
              {...common}
            />
          );
        })}
      </div>
    </div>
  );
}
