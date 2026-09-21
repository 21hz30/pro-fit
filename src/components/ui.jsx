import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Bell, CalendarDays, CalendarRange, History, MessageSquare, Timer, Clock, ClipboardCheck, Camera, CheckCheck, ChevronLeft,
  ChevronRight, Circle, CircleCheck, CircleHelp, CirclePlay, CirclePlus,
  CloudUpload, Dumbbell, Ellipsis, Flame, LayoutDashboard, ListFilter, LoaderCircle,
  LogOut, MailCheck, Menu, Plus, Radio, Search, Send, Trash2, TriangleAlert,
  Trophy, User, UserRoundSearch, Users, Utensils, UtensilsCrossed, Video, X,
} from 'lucide-react';

const iconMap = {
  calendar_view_week: CalendarRange, history: History, chat: MessageSquare, speed: Timer, pending: Clock, rate_review: ClipboardCheck,
  local_dining: Utensils, photo_camera: Camera,
  add: Plus, add_a_photo: Camera, add_circle: CirclePlus, analytics: BarChart3,
  arrow_forward: ArrowRight, calendar_today: CalendarDays, check_circle: CircleCheck,
  chevron_left: ChevronLeft, chevron_right: ChevronRight, close: X,
  cloud_upload: CloudUpload, dashboard: LayoutDashboard, delete: Trash2,
  done_all: CheckCheck, emoji_events: Trophy, filter_list: ListFilter,
  fitness_center: Dumbbell, group: Users, help: CircleHelp,
  local_fire_department: Flame, loading: LoaderCircle, logout: LogOut,
  mark_email_read: MailCheck, menu: Menu, monitoring: BarChart3, more_horiz: Ellipsis,
  notifications: Bell, person: User, person_search: UserRoundSearch,
  play_circle: CirclePlay, radio_button_unchecked: Circle, restaurant: Utensils,
  restaurant_menu: UtensilsCrossed, search: Search, send: Send, sensors: Radio,
  set_meal: Utensils, videocam: Video, warning: TriangleAlert,
};

export function Icon({ name, filled = false, className = '' }) {
  const Symbol = iconMap[name] || Circle;
  return <Symbol aria-hidden="true" className={`material-symbols-outlined ${className}`} strokeWidth={filled ? 2.5 : 2} />;
}

export function Brand({ compact = false }) {
  return <div className={`brand ${compact ? 'brand--compact' : ''}`}><strong>PRO-FIT</strong><span>Train with purpose</span></div>;
}

export function Button({ children, variant = 'primary', className = '', icon, busy = false, ...props }) {
  return (
    <button className={`button button--${variant} ${className}`} {...props} disabled={busy || props.disabled}>
      {busy ? <Icon name="loading" className="spin" /> : icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

export function Field({ label, action, className = '', ...props }) {
  const labelId = useId();
  return (
    <label className={`field ${className}`}>
      <span className="field__label"><span id={labelId}>{label}</span>{action}</span>
      <input aria-labelledby={labelId} {...props} />
    </label>
  );
}

export function SelectField({ label, children, className = '', ...props }) {
  const labelId = useId();
  return <label className={`field ${className}`}><span className="field__label"><span id={labelId}>{label}</span></span><select aria-labelledby={labelId} {...props}>{children}</select></label>;
}

export function TextAreaField({ label, className = '', ...props }) {
  const labelId = useId();
  return <label className={`field ${className}`}><span className="field__label"><span id={labelId}>{label}</span></span><textarea aria-labelledby={labelId} {...props} /></label>;
}

export function SectionHeader({ children, trailing }) {
  return <header className="section-header"><h2>{children}</h2>{trailing}</header>;
}

export function Toast({ message, tone = 'success', onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <div className={`toast toast--${tone}`} role={tone === 'error' ? 'alert' : 'status'}><Icon name={tone === 'error' ? 'warning' : 'check_circle'} filled /><span>{message}</span></div>;
}

export function Modal({ title, children, onClose }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...panelRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')].filter((element) => element.getClientRects().length);
    (focusable()[0] || panelRef.current).focus();
    function keyboard(event) {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (!first) { event.preventDefault(); panelRef.current.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="modal__backdrop" aria-label="Close modal" onClick={onClose} />
      <section className="modal__panel" ref={panelRef} tabIndex={-1}>
        <header><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        {children}
      </section>
    </div>
  );
}

export function PageState({ icon = 'loading', title, message, action }) {
  return <div className="empty-state page-state"><Icon name={icon} className={icon === 'loading' ? 'spin' : ''} /><strong>{title}</strong>{message ? <span>{message}</span> : null}{action}</div>;
}

const roleNav = {
  trainee: [{ label: "Today's Training", icon: 'fitness_center', route: 'trainee' }, { label: 'My Day', icon: 'calendar_today', route: 'day' }],
  coach: [
    { label: 'Coachees', icon: 'group', route: 'coach' },
    { label: 'Workouts', icon: 'fitness_center', route: 'workout' },
    { label: 'Nutrition', icon: 'restaurant', route: 'diet' },
    { label: 'Weekly Schedule', icon: 'calendar_today', route: 'schedule' },
  ],
};

export function AppShell({ route, navigate, role, profile, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems = roleNav[role] || [];
  const NavButtons = ({ closeAfter = false }) => navItems.map((item) => (
    <button key={item.route} className={route === item.route ? 'active' : ''} onClick={() => { navigate(item.route); if (closeAfter) setMenuOpen(false); }}>
      <Icon name={item.icon} filled={route === item.route} /><span>{item.label}</span>
    </button>
  ));
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Brand />
        <nav className="sidebar__nav"><NavButtons /></nav>
        <div className="sidebar__footer">
          {role === 'coach' ? <Button onClick={() => navigate('workout')}>Assign Plan</Button> : null}
          <span className="signed-in-as">{profile?.display_name}<small>{role === 'coach' ? 'Coach' : 'Coachee'}</small></span>
          <button className="sidebar__utility" onClick={onLogout}><Icon name="logout" /><span>Logout</span></button>
        </div>
      </aside>
      <header className="mobile-header">
        <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
        <Brand compact />
        <span className="mobile-role">{role === 'coach' ? 'Coach' : 'Coachee'}</span>
      </header>
      {menuOpen ? (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="mobile-drawer__panel">
            <button className="icon-button mobile-drawer__close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><Icon name="close" /></button>
            <Brand /><NavButtons closeAfter /><button onClick={onLogout}><Icon name="logout" /><span>Logout</span></button>
          </div>
          <button className="mobile-drawer__backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />
        </div>
      ) : null}
      <main className="app-main">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation"><NavButtons /></nav>
    </div>
  );
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'PF';
}
