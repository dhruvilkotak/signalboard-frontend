// src/components/shell/Icons.jsx — small stroke icons for the app shell
const P = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
export const IconHome    = () => <svg {...P}><path d="M3 17l5-6 4 3 7-8" /><path d="M3 21h18" /></svg>;
export const IconSignals = () => <svg {...P}><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" /></svg>;
export const IconAuto    = () => <svg {...P}><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01" /></svg>;
export const IconChat    = () => <svg {...P}><path d="M4 5h16v11H9l-5 4z" /></svg>;
export const IconAccount = () => <svg {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const IconLock    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
