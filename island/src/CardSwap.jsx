import React, { Children, cloneElement, forwardRef, isValidElement, useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
// NOTE: CardSwap.css is injected at runtime from main.jsx (see the ?inline
// import there). This island ships as a single self-contained JS bundle with
// no separate stylesheet linked on the page, so we must not `import` the CSS
// here — that would emit an assets/automations.css that index.html never loads.

export const Card = forwardRef(({ customClass, ...rest }, ref) => (
  <div ref={ref} {...rest} className={`card ${customClass ?? ''} ${rest.className ?? ''}`.trim()} />
));
Card.displayName = 'Card';

const makeSlot = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i
});
const placeNow = (el, slot, skew) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true
  });

const CardSwap = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = 'elastic',
  autoplay = true,   // ambient auto-swap; turned off on mobile where the scroll-gate drives stepping
  apiRef,            // ref populated with { step(dir), count } for external (scroll-gate) control
  children
}) => {
  const config =
    easing === 'elastic'
      ? {
          ease: 'elastic.out(0.6,0.9)',
          durDrop: 2,
          durMove: 2,
          durReturn: 2,
          promoteOverlap: 0.9,
          returnDelay: 0.05
        }
      : {
          ease: 'power1.inOut',
          durDrop: 0.8,
          durMove: 0.8,
          durReturn: 0.8,
          promoteOverlap: 0.45,
          returnDelay: 0.2
        };

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => React.createRef()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childArr.length]
  );

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));

  const tlRef = useRef(null);
  const intervalRef = useRef();
  const container = useRef(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    const total = refs.length;
    refs.forEach((r, i) => placeNow(r.current, makeSlot(i, cardDistance, verticalDistance, total), skewAmount));

    const swap = () => {
      if (order.current.length < 2) return;

      const [front, ...rest] = order.current;
      const elFront = refs[front].current;
      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(elFront, {
        y: '+=500',
        duration: config.durDrop,
        ease: config.ease
      });

      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, 'promote');
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease
          },
          `promote+=${i * 0.15}`
        );
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      tl.call(
        () => {
          gsap.set(elFront, { zIndex: backSlot.zIndex });
        },
        undefined,
        'return'
      );
      tl.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease
        },
        'return'
      );

      tl.call(() => {
        order.current = [...rest, front];
      });
    };

    // Bounded manual stepping, used by the mobile scroll-gate. Unlike the
    // ambient auto-swap (front card drops to the back), this is a quick reflow
    // in either direction: the outgoing card drops out while the rest slide
    // into their new slots. dir > 0 advances (front -> back), dir < 0 goes back
    // (back -> front).
    const doStep = dir => {
      if (animatingRef.current || order.current.length < 2) return;
      const n = order.current.length;
      const total = refs.length;
      const moving = dir > 0 ? order.current[0] : order.current[n - 1];
      const newOrder =
        dir > 0
          ? [...order.current.slice(1), moving]
          : [moving, ...order.current.slice(0, n - 1)];
      const elMove = refs[moving].current;
      const mslot = makeSlot(newOrder.indexOf(moving), cardDistance, verticalDistance, total);
      animatingRef.current = true;
      const tl = gsap.timeline({
        onComplete: () => {
          order.current = newOrder;
          animatingRef.current = false;
        }
      });
      tl.to(elMove, { y: '+=340', duration: 0.24, ease: 'power2.in' }, 0);
      newOrder.forEach((idx, i) => {
        if (idx === moving) return;
        const slot = makeSlot(i, cardDistance, verticalDistance, total);
        tl.set(refs[idx].current, { zIndex: slot.zIndex }, 0);
        tl.to(refs[idx].current, { x: slot.x, y: slot.y, z: slot.z, duration: 0.4, ease: 'power2.out' }, 0.04);
      });
      tl.set(elMove, { zIndex: mslot.zIndex }, 0.22);
      tl.to(elMove, { x: mslot.x, y: mslot.y, z: mslot.z, duration: 0.4, ease: 'power2.out' }, 0.22);
    };
    if (apiRef) apiRef.current = { step: doStep, count: refs.length };

    if (autoplay) {
      swap();
      intervalRef.current = window.setInterval(swap, delay);

      if (pauseOnHover) {
        const node = container.current;
        const pause = () => {
          tlRef.current?.pause();
          clearInterval(intervalRef.current);
        };
        const resume = () => {
          tlRef.current?.play();
          intervalRef.current = window.setInterval(swap, delay);
        };
        node.addEventListener('mouseenter', pause);
        node.addEventListener('mouseleave', resume);
        return () => {
          node.removeEventListener('mouseenter', pause);
          node.removeEventListener('mouseleave', resume);
          clearInterval(intervalRef.current);
          if (apiRef) apiRef.current = null;
        };
      }
    }
    return () => {
      clearInterval(intervalRef.current);
      if (apiRef) apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing, autoplay]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: e => {
            child.props.onClick?.(e);
            onCardClick?.(i);
          }
        })
      : child
  );

  return (
    <div ref={container} className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
};

export default CardSwap;
