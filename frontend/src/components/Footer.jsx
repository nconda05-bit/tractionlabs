import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-navy-900" data-testid="footer">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2 max-w-sm">
          <Logo size={44} />
          <p className="mt-5 text-slate-400 leading-relaxed text-sm">
            AI-powered customer acquisition systems for local businesses. We help service
            businesses attract, convert, and track new customers.
          </p>
          <Link
            to="/contact"
            data-testid="footer-cta"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-electric/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-300 hover:bg-electric"
          >
            Book Your Free Growth Audit <ArrowUpRight size={16} />
          </Link>
        </div>

        <div>
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Explore</h4>
          <ul className="mt-4 space-y-3 text-sm">
            {["Home", "Services", "Process", "About", "Contact"].map((l) => (
              <li key={l}>
                <Link
                  to={l === "Home" ? "/" : `/${l.toLowerCase()}`}
                  className="text-slate-400 hover:text-white transition-colors duration-200"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">Industries</h4>
          <ul className="mt-4 space-y-3 text-sm">
            {["HVAC Companies", "Roofers", "Landscapers", "Contractors", "Home Services"].map((l) => (
              <li key={l} className="text-slate-400">{l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} Traction Labs. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-electric transition-colors" data-testid="footer-login">Team Login</Link>
            <p className="font-mono">Built to convert visitors into booked calls.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
