import { Link } from "react-router-dom";

export const LogoMark = ({ size = 40, className = "" }) => (
  <span
    className={`inline-flex items-center justify-center rounded-full bg-white ring-1 ring-white/10 shadow-[0_4px_20px_rgba(59,130,246,0.25)] overflow-hidden ${className}`}
    style={{ width: size, height: size }}
    data-testid="logo-mark"
  >
    <img src="/logo-v2.png" alt="Traction Labs" style={{ width: "94%", height: "94%", objectFit: "contain" }} />
  </span>
);

export const Logo = ({ to = "/", size = 40, showText = true }) => (
  <Link to={to} className="flex items-center gap-3 group" data-testid="logo-link">
    <LogoMark size={size} />
    {showText && (
      <span className="font-heading font-extrabold tracking-tight text-lg leading-none">
        <span className="text-white">Traction</span>{" "}
        <span className="text-electric">Labs</span>
      </span>
    )}
  </Link>
);

export default Logo;
