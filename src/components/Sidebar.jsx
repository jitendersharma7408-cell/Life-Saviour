import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ListChecks, ShieldCheck, ScrollText, HeartPulse, Menu, X, LayoutDashboard, Users2, ScanLine, Stethoscope, Pill } from 'lucide-react';
import { CONSENT_ROLES, AUDIT_ROLES, FULL_ACCESS_ROLES } from '@/lib/care';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';

function navItems(role, t) {
  const items = [
    { to: '/', label: t('today'), icon: ListChecks, end: true },
    { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/medicine-scanner', label: t('medicineScanner'), icon: Pill },
    { to: '/doctor-ai', label: t('doctorAi'), icon: Stethoscope },
    { to: '/families', label: t('families'), icon: Users2 },
    { to: '/scanner', label: t('scanner'), icon: ScanLine }
  ];
  if (CONSENT_ROLES.includes(role)) items.push({ to: '/consent', label: t('consent'), icon: ShieldCheck });
  if (AUDIT_ROLES.includes(role)) items.push({ to: '/audit', label: t('audit'), icon: ScrollText });
  return items;
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
        <HeartPulse className="h-5 w-5 text-primary" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold">Life Saviour</div>
        <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Care Coordination</div>
      </div>
    </div>
  );
}

function RoleTag({ role, t }) {
  return (
    <div className="border-t">
      <div className="px-5 py-2 text-xs text-muted-foreground">
        {t('signedInAs')} <span className="font-medium text-foreground capitalize">{role || t('staff')}</span>
      </div>
      <LanguageSelector />
    </div>
  );
}

export default function Sidebar({ role }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const items = navItems(role, t);
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;
  const NavList = () => (
    <nav className="flex-1 p-3 space-y-1">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={linkClass} onClick={() => setOpen(false)}>
          <it.icon className="h-4 w-4" />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <>
      <div className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between bg-background border-b px-4 h-14">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">Life Saviour</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 -mr-2" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </div>
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r bg-background h-screen sticky top-0">
        <div className="flex items-center px-5 h-16 border-b"><Brand /></div>
        <NavList />
        <RoleTag role={role} t={t} />
      </aside>
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-background border-r flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b">
              <Brand />
              <button onClick={() => setOpen(false)} className="p-2" aria-label="Close menu"><X className="h-5 w-5" /></button>
            </div>
            <NavList />
            <RoleTag role={role} t={t} />
          </aside>
        </div>
      )}
    </>
  );
}