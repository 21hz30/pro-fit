import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { getGuideLayout } from '../domain/guideLayout.js';
import { getWorkspaceGuideSteps } from './workspaceGuideSteps.js';

export function WorkspaceGuide({ role, isLocal, route, onNavigate, onClose, currentPageOnly = false }) {
  const [steps] = useState(() => {
    const all = getWorkspaceGuideSteps(role, isLocal);
    const page = all.filter((step) => step.route === route);
    return currentPageOnly && page.length ? page : all;
  });
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [cardSize, setCardSize] = useState({ width: 340, height: 260 });
  const cardRef = useRef(null);
  const headingRef = useRef(null);
  const navigateRef = useRef(onNavigate);
  const closeRef = useRef(onClose);
  navigateRef.current = onNavigate;
  closeRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();
  const step = steps[index];

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function keyboard(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const buttons = [...cardRef.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keyboard);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    const measureCard = () => {
      const rect = cardRef.current.getBoundingClientRect();
      setCardSize({ width: rect.width, height: rect.height });
    };
    measureCard();
    const observer = new ResizeObserver(measureCard);
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    setTargetRect(null);
    setUnavailable(false);
    if (route !== step.route) navigateRef.current(step.route);
    let target = null;
    let frame = 0;
    let scrolled = false;
    function update() {
      const size = { width: window.innerWidth, height: window.innerHeight };
      setViewport((previous) => previous.width === size.width && previous.height === size.height ? previous : size);
      const path = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      if (path !== step.route) return;
      const element = [...document.querySelectorAll(`[data-guide="${step.target}"]`)].find((candidate) => candidate.getClientRects().length);
      if (!element) return;
      if (target !== element) {
        target = element;
        resizeObserver.observe(target);
        scrolled = false;
      }
      if (!scrolled) {
        const rect = target.getBoundingClientRect();
        const cardHeight = cardRef.current.getBoundingClientRect().height;
        const topPadding = size.width <= 860 ? 90 : 30;
        const availableBottom = size.height - cardHeight - 50;
        if (rect.top < topPadding || rect.bottom > availableBottom) {
          window.scrollBy({ top: rect.top - topPadding, behavior: 'instant' });
        }
        scrolled = true;
      }
      const rect = target.getBoundingClientRect();
      const next = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      setTargetRect((previous) => previous && Object.keys(next).every((key) => Math.abs(previous[key] - next[key]) < 1) ? previous : next);
      setUnavailable(false);
    }
    function scheduleUpdate() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); }
    function handleResize() { scrolled = false; scheduleUpdate(); }
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(document.querySelector('.workspace-surface'), { childList: true, subtree: true });
    const timeout = window.setTimeout(() => { if (!target) setUnavailable(true); }, 10000);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', scheduleUpdate, true);
    window.visualViewport?.addEventListener('resize', handleResize);
    scheduleUpdate();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      resizeObserver.disconnect(); mutationObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [step, route]);

  const layout = getGuideLayout(targetRect, viewport, cardSize);
  const hole = layout.spotlight;
  const mask = `M0,0 H${viewport.width} V${viewport.height} H0 Z${hole ? ` M${hole.x},${hole.y} h${hole.width} v${hole.height} h-${hole.width} Z` : ''}`;
  return <div className="guided-tour" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
    <svg className="guided-tour__shade" width={viewport.width} height={viewport.height} aria-hidden="true"><path d={mask} fillRule="evenodd" /></svg>
    {hole ? <div className="guided-tour__spotlight" aria-hidden="true" style={{ left: hole.x, top: hole.y, width: hole.width, height: hole.height }} /> : null}
    <section className="guided-tour__card" ref={cardRef} style={{ left: layout.left, top: layout.top }}>
      <div className="guided-tour__progress"><span>{role === 'coach' ? 'COACH' : 'COACHEE'} · PAGE GUIDE</span><span>{String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}</span></div>
      <div className="guided-tour__dots" aria-hidden="true">{steps.map((_, position) => <i key={position} className={position <= index ? 'active' : ''} />)}</div>
      <h2 id={titleId} ref={headingRef} tabIndex={-1}>{step.title}</h2>
      <p id={descriptionId}>{step.text}</p>
      {!hole ? <p className="guided-tour__loading" role="status">{unavailable ? 'This section is unavailable right now. You can continue the guide or skip it.' : 'Opening this section…'}</p> : null}
      <div className="guided-tour__actions">
        <button className="guided-tour__skip" onClick={onClose}>Skip guide</button>
        <div><button className="guided-tour__back" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Back</button><button className="guided-tour__next" onClick={() => index === steps.length - 1 ? onClose() : setIndex((value) => value + 1)}>{index === steps.length - 1 ? 'Finish' : 'Next'}<span aria-hidden="true">→</span></button></div>
      </div>
    </section>
  </div>;
}
