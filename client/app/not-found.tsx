import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <span className="eyebrow">
        {"{"} 404 {"}"}
      </span>
      <h1>This page stepped out.</h1>
      <p>Let’s get you back to a service you can rely on.</p>
      <Link className="button button-dark" href="/services">
        <ArrowLeft size={16} />
        Explore services
      </Link>
    </main>
  );
}
