import Link from "next/link";

/** Shared web navigation; hidden on the existing print/PDF layout. */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link
          href="/"
          className="site-wordmark"
          aria-label="The Morning Paper home"
        >
          The Morning Paper<span aria-hidden>.</span>
        </Link>
        <nav aria-label="Main navigation" className="site-navigation">
          <Link href="/today">Today</Link>
          <Link href="/archive">Archive</Link>
          <Link href="/paper/demo" className="site-sample-link">
            Read a sample <span aria-hidden>↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
