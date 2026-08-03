import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserPlus, Bot, FileText, LogOut, ExternalLink, Menu, X, Images, Brain } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/Logo";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true, testid: "nav-dash-home" },
  { to: "/dashboard/clients", label: "Clients", icon: Users, testid: "nav-dash-clients" },
  { to: "/dashboard/onboard", label: "Onboard Client", icon: UserPlus, testid: "nav-dash-onboard" },
  { to: "/dashboard/coo", label: "AI COO", icon: Bot, testid: "nav-dash-coo" },
  { to: "/dashboard/intelligence", label: "Intelligence", icon: Brain, testid: "nav-dash-intelligence" },
  { to: "/dashboard/library", label: "Creative Library", icon: Images, testid: "nav-dash-library" },
  { to: "/dashboard/documents", label: "Documents", icon: FileText, testid: "nav-dash-docs" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const SideContent = () => (
    <>
      <div className="px-6 py-6 flex items-center gap-3 border-b border-white/5">
        <LogoMark size={38} />
        <div className="leading-tight">
          <p className="font-heading font-extrabold text-sm">Traction <span className="text-electric">Labs</span></p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Agency OS</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              data-testid={n.testid}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-200 ${
                  isActive ? "bg-electric/15 text-white ring-1 ring-electric/30" : "text-slate-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} /> {n.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <button onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors" data-testid="nav-view-site">
          <ExternalLink size={16} /> View public site
        </button>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-electric/15 font-heading font-bold text-electric text-sm">
            {(user?.name || "N").charAt(0)}
          </span>
          <div className="flex-1 leading-tight">
            <p className="text-sm font-semibold">{user?.name || "Nasir"}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-coral transition-colors" data-testid="logout-btn" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 left-0 glass border-r border-white/5 z-40">
        <SideContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 glass border-b border-white/5 h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2"><LogoMark size={32} /><span className="font-heading font-bold text-sm">Agency OS</span></div>
        <button onClick={() => setOpen((v) => !v)} data-testid="dash-mobile-toggle" className="p-2 text-white">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <aside className="lg:hidden fixed inset-y-0 left-0 w-72 flex flex-col glass border-r border-white/5 z-50">
          <SideContent />
        </aside>
      )}
      {open && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />}

      {/* Main */}
      <main className="flex-1 lg:ml-72 pt-16 lg:pt-0 min-w-0">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
