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

  To add a file: add one object to the array below. That's it.
    id      - unique string (React key)
    title   - text on the tab and file face
    href    - optional link. Present = the file is an <a>
    accent  - optional tab color (defaults to ink black)
*/

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

  return (
    <div className="fd-scene" aria-label="File drawer navigation">
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
          // Depth slot: i = 0 is the FRONT file (closest to viewer)
          const depthPos = rowDepth / 2 - i * spacing;

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
              zIndex: i + 1, // fallback stacking, 3D depth does the rest
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
                {/* zero-padded index, e.g. No. 01 */}
                <span className="fd-No">
                  No. {String(i + 1).padStart(2, "0")}
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