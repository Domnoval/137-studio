import Link from "next/link";

const SITE_LINKS = [
  { label: "Works", href: "/#gallery" },
  { label: "Voice", href: "/sing" },
  { label: "Lyrics", href: "/lyrics" },
  { label: "Play", href: "/play" },
  { label: "RNG", href: "/rng" },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="border-t border-[#2a2825] mt-16"
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        background: "#0a0908",
      }}
    >
      <div className="max-w-[1600px] mx-auto px-6 py-12 grid gap-10 md:grid-cols-3">
        {/* Brand */}
        <div>
          <p
            className="text-xl text-[#e8e4dc] leading-none"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              letterSpacing: "0.08em",
            }}
          >
            137 Studio
          </p>
          <p
            className="text-[0.7rem] text-[#a09890] mt-3 leading-relaxed"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "0.95rem",
            }}
          >
            Art. Code. Philosophy. Sound.
          </p>
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[#a09890]/70 mt-4">
            Michael MacDonald
          </p>
        </div>

        {/* Site links */}
        <nav aria-label="Site">
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[#a09890] mb-4">
            Explore
          </p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            {SITE_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-xs uppercase tracking-[0.15em] text-[#e8e4dc] hover:text-[#c41230] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div>
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[#a09890] mb-4">
            Contact
          </p>
          <ul className="list-none m-0 p-0 flex flex-col gap-2">
            <li>
              <a
                href="mailto:the37thmover@gmail.com"
                className="text-xs text-[#e8e4dc] hover:text-[#c41230] transition-colors inline-block"
                style={{ letterSpacing: "0.06em" }}
              >
                the37thmover@gmail.com
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/domnoval_art"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#e8e4dc] hover:text-[#c41230] transition-colors inline-block"
                style={{ letterSpacing: "0.08em" }}
              >
                @domnoval_art
              </a>
            </li>
          </ul>
          <p
            className="text-[#a09890] mt-4 leading-relaxed max-w-[26ch]"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "0.9rem",
            }}
          >
            For commissions and originals — reach out directly.
          </p>
        </div>
      </div>

      <div className="border-t border-[#2a2825]">
        <div className="max-w-[1600px] mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[#a09890]/70">
            © {year} 137 Studio
          </p>
          <p
            className="text-[0.55rem] uppercase tracking-[0.2em] text-[#a09890]/50"
            aria-hidden="true"
          >
            α = 1/137.036
          </p>
        </div>
      </div>
    </footer>
  );
}
