import { ReactNode, useState } from 'react';
import { Link } from 'wouter';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
           {/* Navbar ציבורי */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 flex-row-reverse">
          {/* לוגו – מימין */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
            data-testid="link-logo"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
              <Heart className="h-4 w-4" />
            </span>
            <span>MEMORAID</span>
          </Link>

          {/* תפריט אמצעי (דסקטופ) */}
          <nav className="hidden items-center gap-6 text-sm text-[hsl(var(--muted-foreground))] lg:flex">
            <Link href="/" data-testid="nav-home" className="hover:text-[hsl(var(--foreground))]">
              ראשי
            </Link>
            <Link
              href="/features"
              data-testid="nav-features"
              className="hover:text-[hsl(var(--foreground))]"
            >
              תכונות
            </Link>
            <Link
              href="/pricing"
              data-testid="nav-pricing"
              className="hover:text-[hsl(var(--foreground))]"
            >
              תמחור
            </Link>
            <Link
              href="/resources"
              data-testid="nav-resources"
              className="hover:text-[hsl(var(--foreground))]"
            >
              מרכז מידע
            </Link>
            <Link
              href="/about"
              data-testid="nav-about"
              className="hover:text-[hsl(var(--foreground))]"
            >
              אודות
            </Link>
            <Link
              href="/contact"
              data-testid="nav-contact"
              className="hover:text-[hsl(var(--foreground))]"
            >
              צור קשר
            </Link>
          </nav>

          {/* כפתורי כניסה / הרשמה – משמאל בדסקטופ */}
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              data-testid="nav-login"
              className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs font-medium hover:bg-[hsl(var(--card))]"
            >
              כניסה
            </Link>
            <Link
              href="/login"
              data-testid="nav-signup"
              className="rounded-full bg-[hsl(var(--primary))] px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-90"
            >
              הרשמה בחינם
            </Link>
          </div>

          {/* כפתור מובייל */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs lg:hidden"
            data-testid="button-mobile-menu"
          >
            {mobileOpen ? 'סגור' : 'תפריט'}
          </button>
        </div>

        {/* תפריט מובייל */}
        {mobileOpen && (
          <nav className="mx-auto mt-1 flex max-w-6xl flex-col gap-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 text-sm text-[hsl(var(--muted-foreground))] lg:hidden">
            <Link href="/" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-home">
              ראשי
            </Link>
            <Link href="/features" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-features">
              תכונות
            </Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-pricing">
              תמחור
            </Link>
            <Link href="/resources" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-resources">
              מרכז מידע
            </Link>
            <Link href="/about" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-about">
              אודות
            </Link>
            <Link href="/contact" onClick={() => setMobileOpen(false)} className="py-1" data-testid="nav-contact">
              צור קשר
            </Link>
            <div className="mt-2 flex flex-col gap-2 border-t border-[hsl(var(--border))] pt-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs font-medium text-center"
                data-testid="nav-login"
              >
                כניסה
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-full bg-[hsl(var(--primary))] px-3 py-1 text-xs font-medium text-white text-center shadow-sm"
                data-testid="nav-signup"
              >
                הרשמה בחינם
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* תוכן הדף */}
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>

      {/* Footer ציבורי */}
      <footer className="mt-16 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-[hsl(var(--muted-foreground))] md:grid-cols-2 lg:grid-cols-4">
          {/* לוגו + תיאור */}
          <div>
            <div className="mb-3 flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white">
                <Heart className="h-4 w-4" />
              </span>
              <span>MEMORAID</span>
            </div>
            <p className="mb-3 text-xs">
              פלטפורמה ישראלית לניהול טיפול משפחתי. כל המשפחה מעודכנת. תמיד.
            </p>
            <div className="flex gap-3 text-xs" aria-label="social links">
              <a href="#" className="hover:text-[hsl(var(--foreground))]" data-testid="social-facebook">
                Facebook
              </a>
              <a href="#" className="hover:text-[hsl(var(--foreground))]" data-testid="social-linkedin">
                LinkedIn
              </a>
              <a href="#" className="hover:text-[hsl(var(--foreground))]" data-testid="social-youtube">
                YouTube
              </a>
            </div>
          </div>

          {/* המוצר */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">המוצר</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="/features" data-testid="footer-features" className="hover:text-[hsl(var(--foreground))]">
                  תכונות
                </a>
              </li>
              <li>
                <a href="/pricing" data-testid="footer-pricing" className="hover:text-[hsl(var(--foreground))]">
                  תמחור
                </a>
              </li>
              <li>
                <a href="/resources" data-testid="footer-resources" className="hover:text-[hsl(var(--foreground))]">
                  מרכז מידע
                </a>
              </li>
              <li>
                <a href="#faq" data-testid="footer-faq" className="hover:text-[hsl(var(--foreground))]">
                  שאלות נפוצות
                </a>
              </li>
            </ul>
          </div>

          {/* החברה + משפטי */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">החברה</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="/about" data-testid="footer-about" className="hover:text-[hsl(var(--foreground))]">
                  אודות
                </a>
              </li>
              <li>
                <a href="/contact" data-testid="footer-contact" className="hover:text-[hsl(var(--foreground))]">
                  צור קשר
                </a>
              </li>
            </ul>
            <h4 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide">משפטי</h4>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="#" data-testid="footer-terms" className="hover:text-[hsl(var(--foreground))]">
                  תנאי שימוש
                </a>
              </li>
              <li>
                <a href="#" data-testid="footer-privacy" className="hover:text-[hsl(var(--foreground))]">
                  מדיניות פרטיות
                </a>
              </li>
              <li>
                <a href="#" data-testid="footer-accessibility" className="hover:text-[hsl(var(--foreground))]">
                  הצהרת נגישות
                </a>
              </li>
            </ul>
          </div>

          {/* צור קשר */}
          <div id="contact">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide">צור קשר</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span>support@memoraid.co.il</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <span>03-1234567</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-[#25D366]" />
                <span>050-1234567 (WhatsApp)</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                <span>תל אביב, ישראל</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-[10px] text-[hsl(var(--muted-foreground))] md:flex-row md:items-center md:justify-between">
            <span>
              © {year} MEMORAID. כל הזכויות שמורות.
            </span>
            <span>נבנה באהבה עבור משפחות מטפלות בישראל.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
