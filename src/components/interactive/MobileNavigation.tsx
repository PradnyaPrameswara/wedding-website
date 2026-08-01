import { useState } from 'react';
import { Button } from '@/components/ui/button';

const links = [
  ['Home', '/'],
  ['Couple', '/#Couple'],
  ['Wedding blog', '/#blog'],
  ['Our Story', '/#story'],
  ['Our Events', '/#events'],
  ['RSVP', '/#rsvp'],
] as const;

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);

  return (
    <div className="astro-mobile-nav">
      <Button
        type="button"
        className="astro-mobile-nav__toggle"
        aria-expanded={open}
        aria-controls="astro-mobile-nav-menu"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? '\u00D7' : '\u2630'}</span>
      </Button>
      <nav
        id="astro-mobile-nav-menu"
        className="astro-mobile-nav__menu"
        data-open={open}
        aria-hidden={!open}
        aria-label="Mobile navigation"
      >
        {links.map(([label, href]) => (
          <a key={href} href={href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>{label}</a>
        ))}
      </nav>
    </div>
  );
}
