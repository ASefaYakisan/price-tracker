import { notFound } from "next/navigation";

// Unknown addresses under a language. Without a page here Next shows its own default 404, outside the site design.
export default function UnknownPage() {
  notFound();
}
