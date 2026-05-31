import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    publicApi, type LandingPageData, type PublicDocument,
    type UpcomingMeeting, formatCategory,
} from '../api/public-api';
import { format } from 'date-fns';

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current; if (!el) return;
        const o = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) { setVisible(true); o.disconnect(); }
        }, { threshold: 0.1 });
        o.observe(el); return () => o.disconnect();
    }, []);
    return { ref, visible };
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
    const [v, setV] = useState(0);
    const { ref, visible } = useReveal();
    useEffect(() => {
        if (!visible || to === 0) return;
        let n = 0;
        const step = Math.max(1, Math.ceil(to / 50));
        const id = setInterval(() => {
            n = Math.min(n + step, to);
            setV(n);
            if (n >= to) clearInterval(id);
        }, 28);
        return () => clearInterval(id);
    }, [visible, to]);
    return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style = {} }: {
    children: React.ReactNode; delay?: number; style?: React.CSSProperties;
}) {
    const { ref, visible } = useReveal();
    return (
        <div ref={ref} style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : 'translateY(24px)',
            transition: `opacity .6s ease ${delay}s, transform .6s ease ${delay}s`,
            ...style,
        }}>
            {children}
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GOLD = '#C9A84C';
const NAVY = '#0b0f1e';

const MTL: Record<string, string> = {
    GENERAL: 'General Meeting', AGM: 'AGM',
    SPECIAL: 'Special Meeting', EMERGENCY: 'Emergency',
};

const DOC_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    MEETING_MINUTES:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Minutes' },
    NOTICE:           { bg: '#fffbeb', color: '#b45309', label: 'Notice' },
    FINANCIAL_REPORT: { bg: '#f0fdf4', color: '#15803d', label: 'Finance' },
    POLICY:           { bg: '#f5f3ff', color: '#6d28d9', label: 'Policy' },
    OTHER:            { bg: '#f4f1eb', color: '#6b6560', label: 'General' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
    const [data, setData] = useState<LandingPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [docFilter, setDocFilter] = useState('all');

    useEffect(() => {
        publicApi.getLanding().then(setData).catch(console.error).finally(() => setLoading(false));
        const h = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    const p = data?.profile;
    const name   = p?.saccoName   ?? 'Betterlink Ventures SACCO';
    const tagline = p?.tagline    ?? 'Built on trust. Growing through unity.';
    const initial = name.charAt(0).toUpperCase();
    const yearsActive = p?.foundedYear ? new Date().getFullYear() - p.foundedYear : 0;

    const pinned  = (data?.announcements ?? []).filter(a => a.isPinned);
    const regular = (data?.announcements ?? []).filter(a => !a.isPinned);
    const docs    = docFilter === 'all'
        ? (data?.documents ?? [])
        : (data?.documents ?? []).filter(d => d.category === docFilter);

    const DOC_CATS = ['all', 'MEETING_MINUTES', 'NOTICE', 'FINANCIAL_REPORT', 'POLICY', 'OTHER'];
    const hasContact = p?.contactPhone || p?.contactEmail || p?.contactAddress;
    const hasAbout   = p?.history || p?.mission || p?.vision;

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: NAVY }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${GOLD}33`, borderTop: `3px solid ${GOLD}`, borderRadius: '50%', animation: 'lp-spin .9s linear infinite' }} />
            <style>{`@keyframes lp-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <>
            <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
            .lp-page{font-family:'DM Sans',system-ui,sans-serif;background:#fafaf7;color:#1a1a1a;-webkit-font-smoothing:antialiased}
            .lp-page *{box-sizing:border-box;margin:0;padding:0}
            @keyframes lp-spin{to{transform:rotate(360deg)}}
            @keyframes lp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
            @keyframes lp-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
            .lp-serif{font-family:'Playfair Display',Georgia,serif}
            .lp-nav-a{color:rgba(255,255,255,.5);font-size:12px;font-weight:500;text-decoration:none;letter-spacing:.05em;text-transform:uppercase;transition:color .2s}
            .lp-nav-a:hover{color:${GOLD}}
            .lp-btn-gold{background:${GOLD};color:${NAVY};padding:11px 26px;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;transition:opacity .2s}
            .lp-btn-gold:hover{opacity:.88}
            .lp-btn-ghost{background:transparent;color:rgba(255,255,255,.6);padding:11px 26px;border-radius:4px;font-size:13px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-family:'DM Sans',sans-serif;transition:border-color .2s,color .2s}
            .lp-btn-ghost:hover{border-color:rgba(255,255,255,.35);color:rgba(255,255,255,.85)}
            .lp-rule::before{content:'';display:block;width:24px;height:1px;background:${GOLD}}
            .lp-rule{display:flex;align-items:center;gap:10px;margin-bottom:14px}
            .lp-rule span{color:${GOLD};font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase}
            .lp-filt-btn{background:#fff;border:0.5px solid #e8e4d8;padding:7px 16px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;font-family:'DM Sans',sans-serif;color:#6b6560;transition:all .2s}
            .lp-filt-btn:hover{border-color:#1a1a1a;color:#1a1a1a}
            .lp-filt-btn.active{background:${NAVY};color:#fff;border-color:${NAVY}}
            .lp-card-hover{transition:transform .25s,box-shadow .25s}
            .lp-card-hover:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.10)}
            .lp-doc-row{transition:transform .2s,box-shadow .2s}
            .lp-doc-row:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.08)}
            .lp-contact-card{transition:border-color .2s,background .2s}
            .lp-contact-card:hover{border-color:${GOLD}66!important;background:rgba(201,168,76,.05)!important}
            .lp-footer-a{color:rgba(255,255,255,.2);font-size:11px;letter-spacing:.06em;text-transform:uppercase;text-decoration:none;transition:color .2s}
            .lp-footer-a:hover{color:${GOLD}}
            ::-webkit-scrollbar{width:4px}
            ::-webkit-scrollbar-track{background:transparent}
            ::-webkit-scrollbar-thumb{background:${GOLD}44;border-radius:99px}
            ::-webkit-scrollbar-thumb:hover{background:${GOLD}}
        `}</style>

            <div className="lp-page">

                {/* ── NAVBAR ─────────────────────────────────────────────────────── */}
                <header style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 64,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 clamp(20px,5vw,56px)',
                    background: scrolled ? 'rgba(11,15,30,.97)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(20px)' : 'none',
                    borderBottom: scrolled ? `1px solid ${GOLD}18` : 'none',
                    transition: 'all .4s ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p?.logoUrl ? (
                            <img src={p.logoUrl} alt="logo"
                                 style={{ height: 38, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.4))' }} />
                        ) : (
                            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${GOLD},#b8962e)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display,serif', fontWeight: 700, color: NAVY, fontSize: 16 }}>
                                {initial}
                            </div>
                        )}
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{name}</div>
                            {p?.foundedYear && <div style={{ color: GOLD, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>Est. {p.foundedYear}</div>}
                        </div>
                    </div>

                    <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        <div style={{ display: 'flex', gap: 28 }}>
                            {[['#about','About'],['#meetings','Meetings'],['#documents','Documents'],['#contact','Contact']].map(([h,l]) =>
                                <a key={h} href={h} className="lp-nav-a">{l}</a>
                            )}
                        </div>
                        <Link to="/login" className="lp-btn-gold" style={{ textDecoration: 'none' }}>
                            User Login
                        </Link>
                    </nav>
                </header>

                {/* ── HERO ───────────────────────────────────────────────────────── */}
                <section style={{ minHeight: '100vh', background: `linear-gradient(165deg,${NAVY} 0%,#111827 60%,#0d1520 100%)`, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px clamp(20px,5vw,56px) 60px', position: 'relative', overflow: 'hidden' }}>
                    {/* Grid overlay */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${GOLD}0a 1px,transparent 1px),linear-gradient(90deg,${GOLD}0a 1px,transparent 1px)`, backgroundSize: '50px 50px', pointerEvents: 'none' }} />
                    {/* Orbs */}
                    <div style={{ position: 'absolute', top: '15%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(${GOLD}12,transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(rgba(29,78,216,.08),transparent 70%)', pointerEvents: 'none' }} />
                    {/* Decorative word */}
                    <div style={{ position: 'absolute', right: '-1%', top: '50%', transform: 'translateY(-50%)', fontFamily: 'Playfair Display,serif', fontWeight: 700, fontSize: 'clamp(80px,15vw,200px)', color: `${GOLD}06`, lineHeight: 1, userSelect: 'none', pointerEvents: 'none', letterSpacing: '-0.04em' }}>SACCO</div>

                    {/* Announcement ticker */}
                    {pinned.length > 0 && (
                        <div style={{ position: 'absolute', top: 64, left: 0, right: 0, borderTop: `1px solid ${GOLD}22`, borderBottom: `1px solid ${GOLD}22`, padding: '9px 0', background: `${GOLD}08`, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', animation: 'lp-marquee 32s linear infinite', width: 'max-content', gap: 64 }}>
                                {[...pinned,...pinned].map((a,i) => (
                                    <span key={i} style={{ color: GOLD, fontSize: 12, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                ◆ &nbsp;{a.title}
                            </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', paddingTop: pinned.length ? 40 : 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 48, alignItems: 'center' }}>
                            {/* Left: copy */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                                    <div style={{ width: 1, height: 40, background: `linear-gradient(${GOLD},transparent)` }} />
                                    <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase' }}>
                                {p?.foundedYear ? `Member-owned · Since ${p.foundedYear}` : 'Member-owned · Nairobi, Kenya'}
                            </span>
                                </div>

                                <h1 className="lp-serif" style={{ fontSize: 'clamp(2.6rem,6vw,4.5rem)', color: '#fff', lineHeight: 1.1, marginBottom: 14 }}>
                                    {name}
                                </h1>
                                <p className="lp-serif" style={{ fontSize: 'clamp(1.2rem,2vw,1.65rem)', color: `${GOLD}bb`, fontStyle: 'italic', fontWeight: 400, marginBottom: 24 }}>
                                    {tagline}
                                </p>
                                {p?.mission && (
                                    <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 15, lineHeight: 1.75, maxWidth: 500, marginBottom: 36 }}>
                                        {p.mission}
                                    </p>
                                )}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                    <a href="#about" className="lp-btn-gold" style={{ textDecoration: 'none' }}>Our Story</a>
                                    <a href="#meetings" className="lp-btn-ghost" style={{ textDecoration: 'none' }}>View Meetings →</a>
                                </div>
                            </div>

                            {/* Right: stat panel */}
                            <div style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${GOLD}22`, borderRadius: 14, padding: '24px 28px', minWidth: 200, backdropFilter: 'blur(16px)' }}>
                                {[
                                    { label: 'Active Members', value: data?.memberCount ?? 0, suffix: '' },
                                    { label: 'Meetings Held',  value: data?.meetingsHeld ?? 0,  suffix: '' },
                                    { label: 'Documents',      value: data?.totalDocuments ?? 0, suffix: '' },
                                    { label: 'Years Active',   value: yearsActive, suffix: '' },
                                ].map((s, i) => (
                                    <div key={i} style={{ padding: i === 0 ? '0 0 20px' : i === 3 ? '20px 0 0' : '20px 0', borderBottom: i < 3 ? `1px solid ${GOLD}14` : 'none' }}>
                                        <div className="lp-serif" style={{ fontSize: 42, fontWeight: 700, color: GOLD, lineHeight: 1 }}>
                                            <Counter to={s.value} suffix={s.suffix} />
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 11, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Scroll hint */}
                        <div style={{ marginTop: 72, display: 'flex', justifyContent: 'center' }}>
                            <a href="#trust" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', animation: 'lp-float 3s ease-in-out infinite' }}>
                                <span style={{ color: 'rgba(255,255,255,.15)', fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase' }}>Scroll</span>
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9l6 6 6-6" stroke={`${GOLD}55`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </a>
                        </div>
                    </div>
                </section>

                {/* ── TRUST STRIP ────────────────────────────────────────────────── */}
                <div id="trust" style={{ background: '#f4f1eb', borderTop: '1px solid #e8e4d8', borderBottom: '1px solid #e8e4d8', padding: '14px clamp(20px,5vw,56px)', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                    <span style={{ color: '#9a9488', fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Why Trust Us</span>
                    <div style={{ width: 1, height: 20, background: '#d8d4c8' }} />
                    {[
                        ['🛡️', 'Member-owned cooperative'],
                        ['🔒', 'Secure & transparent'],
                        ['📋', 'Fully documented records'],
                        ['🤝', 'Community-first values'],
                    ].map(([icon, label]) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#6b6560', fontWeight: 500 }}>
                            <span style={{ fontSize: 15 }}>{icon}</span> {label}
                        </div>
                    ))}
                </div>

                {/* ── ABOUT ──────────────────────────────────────────────────────── */}
                {hasAbout && (
                    <section id="about" style={{ background: '#fafaf7', padding: 'clamp(56px,10vh,100px) clamp(20px,5vw,56px)' }}>
                        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                            <Reveal>
                                <div className="lp-rule"><span>About Us</span></div>
                                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', marginBottom: 8 }}>Who We Are</h2>
                                {tagline && <p style={{ color: '#9a9488', fontSize: 14, lineHeight: 1.65, marginBottom: 40, maxWidth: 520 }}>{tagline}</p>}
                            </Reveal>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
                                {p?.history && (
                                    <Reveal delay={0.1} style={{ gridColumn: (!p?.mission && !p?.vision) ? 'span 3' : undefined }}>
                                        <div className="lp-card-hover" style={{ background: '#fff', border: '0.5px solid #e8e4d8', borderRadius: 14, padding: 36, height: '100%', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: `linear-gradient(${GOLD},transparent)` }} />
                                            <h3 className="lp-serif" style={{ fontSize: 19, marginBottom: 16, color: '#1a1a1a' }}>Our History</h3>
                                            <p style={{ color: '#6b6560', lineHeight: 1.85, fontSize: 14, whiteSpace: 'pre-line' }}>{p.history}</p>
                                        </div>
                                    </Reveal>
                                )}
                                {p?.mission && (
                                    <Reveal delay={0.2}>
                                        <div className="lp-card-hover" style={{ background: NAVY, borderRadius: 14, padding: 36, height: '100%', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', bottom: -24, right: -24, width: 120, height: 120, borderRadius: '50%', background: `${GOLD}12` }} />
                                            <div style={{ fontSize: 28, marginBottom: 16 }}>🎯</div>
                                            <h3 className="lp-serif" style={{ fontSize: 19, marginBottom: 14, color: '#fff' }}>Mission</h3>
                                            <p style={{ color: 'rgba(255,255,255,.5)', lineHeight: 1.8, fontSize: 14 }}>{p.mission}</p>
                                        </div>
                                    </Reveal>
                                )}
                                {p?.vision && (
                                    <Reveal delay={0.3}>
                                        <div className="lp-card-hover" style={{ background: `linear-gradient(135deg,${GOLD},#b8962e)`, borderRadius: 14, padding: 36, height: '100%', position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', top: -16, right: -16, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.12)' }} />
                                            <div style={{ fontSize: 28, marginBottom: 16 }}>🔭</div>
                                            <h3 className="lp-serif" style={{ fontSize: 19, marginBottom: 14, color: NAVY }}>Vision</h3>
                                            <p style={{ color: 'rgba(11,15,30,.65)', lineHeight: 1.8, fontSize: 14 }}>{p.vision}</p>
                                        </div>
                                    </Reveal>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* ── MEETINGS ───────────────────────────────────────────────────── */}
                <section id="meetings" style={{ background: '#fff', borderTop: '1px solid #e8e4d8', padding: 'clamp(56px,10vh,100px) clamp(20px,5vw,56px)' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 44, flexWrap: 'wrap', gap: 20 }}>
                            <div>
                                <div className="lp-rule"><span>Schedule</span></div>
                                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>Upcoming Meetings</h2>
                            </div>
                            <p style={{ color: '#9a9488', fontSize: 14, maxWidth: 340, lineHeight: 1.65 }}>
                                All active members are expected to attend. Minutes are published after each session.
                            </p>
                        </Reveal>

                        {(data?.upcomingMeetings?.length ?? 0) === 0 ? (
                            <Reveal>
                                <div style={{ textAlign: 'center', padding: '72px 0', background: '#f9f7f4', borderRadius: 14, border: '0.5px dashed #d4af3766' }}>
                                    <div style={{ fontSize: 36, marginBottom: 14 }}>📅</div>
                                    <p style={{ color: '#9a9488', fontWeight: 600 }}>No upcoming meetings scheduled</p>
                                    <p style={{ color: '#c5bfb8', fontSize: 13, marginTop: 6 }}>Check back soon.</p>
                                </div>
                            </Reveal>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 20 }}>
                                {(data?.upcomingMeetings ?? []).map((m, i) => (
                                    <MeetCard key={m.id} m={m} featured={i === 0} delay={i * 0.1} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── ANNOUNCEMENTS ──────────────────────────────────────────────── */}
                {regular.length > 0 && (
                    <section style={{ background: '#fafaf7', borderTop: '1px solid #e8e4d8', padding: 'clamp(56px,8vh,80px) clamp(20px,5vw,56px)' }}>
                        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                            <Reveal style={{ marginBottom: 36 }}>
                                <div className="lp-rule"><span>Latest</span></div>
                                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>Announcements</h2>
                            </Reveal>
                            <div style={{ display: 'grid', gap: 14 }}>
                                {regular.map((a, i) => (
                                    <Reveal key={a.id} delay={i * 0.07}>
                                        <div style={{ background: '#fff', border: '0.5px solid #e8e4d8', borderRadius: 12, padding: '24px 28px', display: 'flex', gap: 24 }}>
                                            <div style={{ width: 3, background: `linear-gradient(${GOLD},${GOLD}00)`, borderRadius: 99, flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                                    <h3 className="lp-serif" style={{ fontSize: 18, color: '#1a1a1a' }}>{a.title}</h3>
                                                    <time style={{ color: '#b8b2ab', fontSize: 12, letterSpacing: '.04em' }}>
                                                        {format(new Date(a.createdAt), 'dd MMM yyyy')}
                                                    </time>
                                                </div>
                                                <p style={{ color: '#6b6560', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>{a.body}</p>
                                            </div>
                                        </div>
                                    </Reveal>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ── DOCUMENTS ──────────────────────────────────────────────────── */}
                <section id="documents" style={{ background: '#fff', borderTop: '1px solid #e8e4d8', padding: 'clamp(56px,10vh,100px) clamp(20px,5vw,56px)' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <Reveal style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
                            <div>
                                <div className="lp-rule"><span>Resources</span></div>
                                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem,3.5vw,2.8rem)' }}>Documents & Minutes</h2>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {DOC_CATS.map(cat => (
                                    <button key={cat}
                                            onClick={() => setDocFilter(cat)}
                                            className={`lp-filt-btn${docFilter === cat ? ' active' : ''}`}>
                                        {cat === 'all' ? 'All' : (DOC_STYLE[cat]?.label ?? formatCategory(cat))}
                                    </button>
                                ))}
                            </div>
                        </Reveal>

                        {docs.length === 0 ? (
                            <Reveal>
                                <div style={{ textAlign: 'center', padding: '72px 0', background: '#f9f7f4', borderRadius: 14 }}>
                                    <p style={{ color: '#9a9488' }}>No documents in this category yet.</p>
                                </div>
                            </Reveal>
                        ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                                {docs.map((d, i) => <DocRow key={d.id} doc={d} delay={i * 0.05} />)}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── CONTACT ────────────────────────────────────────────────────── */}
                {hasContact && (
                    <section id="contact" style={{ background: `linear-gradient(165deg,${NAVY},#111827)`, padding: 'clamp(56px,10vh,100px) clamp(20px,5vw,56px)', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(${GOLD}08,transparent 70%)`, pointerEvents: 'none' }} />
                        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                            <Reveal>
                                <div className="lp-rule" style={{ justifyContent: 'center' }}><span>Get In Touch</span></div>
                                <h2 className="lp-serif" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: '#fff', marginBottom: 10 }}>Contact Us</h2>
                                <p style={{ color: 'rgba(255,255,255,.3)', fontSize: 14, marginBottom: 48 }}>
                                    Questions about membership or our services? Reach out directly.
                                </p>
                            </Reveal>

                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 56 }}>
                                {p?.contactPhone && (
                                    <a href={`tel:${p.contactPhone}`} style={{ textDecoration: 'none' }}>
                                        <div className="lp-contact-card" style={{ background: 'rgba(255,255,255,.04)', border: `0.5px solid ${GOLD}22`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
                                            <div style={{ width: 40, height: 40, background: `${GOLD}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📞</div>
                                            <div style={{ textAlign: 'left' }}>
                                                <p style={{ color: `${GOLD}88`, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 3 }}>Phone</p>
                                                <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.contactPhone}</p>
                                            </div>
                                        </div>
                                    </a>
                                )}
                                {p?.contactEmail && (
                                    <a href={`mailto:${p.contactEmail}`} style={{ textDecoration: 'none' }}>
                                        <div className="lp-contact-card" style={{ background: 'rgba(255,255,255,.04)', border: `0.5px solid ${GOLD}22`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 200 }}>
                                            <div style={{ width: 40, height: 40, background: `${GOLD}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✉️</div>
                                            <div style={{ textAlign: 'left' }}>
                                                <p style={{ color: `${GOLD}88`, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 3 }}>Email</p>
                                                <p style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{p.contactEmail}</p>
                                            </div>
                                        </div>
                                    </a>
                                )}
                                {p?.contactAddress && (
                                    <div className="lp-contact-card" style={{ background: 'rgba(255,255,255,.04)', border: `0.5px solid ${GOLD}22`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 40, height: 40, background: `${GOLD}18`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📍</div>
                                        <div style={{ textAlign: 'left' }}>
                                            <p style={{ color: `${GOLD}88`, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 3 }}>Location</p>
                                            <p style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{p.contactAddress}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* ── CTA ────────────────────────────────────────────────────────── */}
                <section style={{ background: '#f4f1eb', borderTop: '1px solid #e8e4d8', padding: '64px clamp(20px,5vw,56px)', textAlign: 'center' }}>
                    <Reveal>
                        <h2 className="lp-serif" style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)', marginBottom: 10 }}>
                            Ready to join the SACCO?
                        </h2>
                        <p style={{ color: '#9a9488', fontSize: 14, marginBottom: 32 }}>
                            Log in to the member portal to manage savings, apply for loans, and stay informed.
                        </p>
                        <Link to="/login" className="lp-btn-gold" style={{ textDecoration: 'none', fontSize: 14, padding: '14px 36px' }}>
                            Access Member Portal →
                        </Link>
                    </Reveal>
                </section>

                {/* ── FOOTER ─────────────────────────────────────────────────────── */}
                <footer style={{ background: '#070b14', borderTop: `1px solid ${GOLD}12`, padding: '24px clamp(20px,5vw,56px)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p?.logoUrl
                            ? <img src={p.logoUrl} alt="logo" style={{ height: 28, width: 'auto', objectFit: 'contain', opacity: .7 }} />
                            : <div style={{ width: 28, height: 28, background: GOLD, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Playfair Display,serif', fontWeight: 700, color: NAVY, fontSize: 13 }}>{initial}</div>
                        }
                        <div>
                            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, fontWeight: 600 }}>{name}</p>
                            {p?.foundedYear && <p style={{ color: `${GOLD}44`, fontSize: 10 }}>Est. {p.foundedYear}</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 24 }}>
                        {[['#about','About'],['#meetings','Meetings'],['#documents','Documents']].map(([h,l]) =>
                            <a key={h} href={h} className="lp-footer-a">{l}</a>
                        )}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,.1)', fontSize: 11 }}>© {new Date().getFullYear()} {name}</p>
                </footer>

            </div>
        </>
    );
}

// ─── Meeting card ─────────────────────────────────────────────────────────────
function MeetCard({ m, featured, delay }: { m: UpcomingMeeting; featured: boolean; delay: number }) {
    const { ref, visible } = (() => {
        const r = useRef<HTMLDivElement>(null);
        const [v, setV] = useState(false);
        useEffect(() => {
            const el = r.current; if (!el) return;
            const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); }}, { threshold: 0.1 });
            o.observe(el); return () => o.disconnect();
        }, []);
        return { ref: r, visible: v };
    })();

    const start = new Date(m.startAt);
    const GOLD = '#C9A84C';
    const NAVY = '#0b0f1e';

    return (
        <div ref={ref} className="lp-card-hover"
             style={{ borderRadius: 14, overflow: 'hidden', opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)', transition: `opacity .6s ease ${delay}s, transform .6s ease ${delay}s`, border: '0.5px solid #e8e4d8' }}>
            <div style={{ background: featured ? `linear-gradient(135deg,${GOLD},#b8962e)` : NAVY, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <p style={{ color: featured ? 'rgba(11,15,30,.5)' : 'rgba(255,255,255,.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
                        {MTL[m.meetingType] ?? m.meetingType}
                    </p>
                    <p style={{ fontFamily: 'Playfair Display,serif', fontSize: 48, fontWeight: 700, color: featured ? NAVY : '#fff', lineHeight: 1 }}>
                        {format(start, 'dd')}
                    </p>
                    <p style={{ color: featured ? 'rgba(11,15,30,.55)' : 'rgba(255,255,255,.4)', fontSize: 13, marginTop: 2 }}>
                        {format(start, 'MMMM yyyy')}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ color: featured ? 'rgba(11,15,30,.45)' : 'rgba(255,255,255,.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Time (EAT)</p>
                    <p style={{ fontFamily: 'Playfair Display,serif', fontSize: 24, fontWeight: 700, color: featured ? NAVY : '#fff' }}>{format(start, 'HH:mm')}</p>
                </div>
            </div>
            <div style={{ background: '#fff', padding: '18px 24px', borderTop: '1px solid #e8e4d8' }}>
                <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: 17, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{m.title}</h3>
                {m.description && <p style={{ color: '#9a9488', fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{m.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
                    <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Scheduled</span>
                </div>
            </div>
        </div>
    );
}

// ─── Document row ─────────────────────────────────────────────────────────────
function DocRow({ doc, delay }: { doc: PublicDocument; delay: number }) {
    const { ref, visible } = (() => {
        const r = useRef<HTMLDivElement>(null);
        const [v, setV] = useState(false);
        useEffect(() => {
            const el = r.current; if (!el) return;
            const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); }}, { threshold: 0.1 });
            o.observe(el); return () => o.disconnect();
        }, []);
        return { ref: r, visible: v };
    })();

    const s = DOC_STYLE[doc.category] ?? DOC_STYLE.OTHER;
    const GOLD = '#C9A84C';
    const NAVY = '#0b0f1e';

    return (
        <div ref={ref} className="lp-doc-row"
             style={{ background: '#fff', border: '0.5px solid #e8e4d8', borderRadius: 12, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(16px)', transition: `opacity .5s ease ${delay}s, transform .5s ease ${delay}s` }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 3 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>{doc.title}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>
                        {s.label}
                    </span>
                </div>
                <p style={{ color: '#b8b2ab', fontSize: 12 }}>
                    {doc.meetingDate ? `Meeting: ${format(new Date(doc.meetingDate), 'dd MMM yyyy')} · ` : ''}
                    Posted {format(new Date(doc.createdAt), 'dd MMM yyyy')}
                </p>
                {doc.description && <p style={{ color: '#9a9488', fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 460 }}>{doc.description}</p>}
            </div>
            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
               style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, letterSpacing: '.05em', textTransform: 'uppercase', background: NAVY, color: GOLD, transition: 'opacity .2s' }}
               onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '.8'}
               onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                ↓ Download
            </a>
        </div>
    );
}