import "../site.css";
import "../site-mono.css";
import "../site-docs.css";
import {
  DocSectionA as DocSection,
  MarketingDocumentA,
  docMetadataA,
} from "../../components/site/DocsA";

export const metadata = docMetadataA(
  "Privacy",
  "How information is used across the website and simulator.",
  "/privacy",
);
export default function Page() {
  return (
    <MarketingDocumentA
      eyebrow={"Privacy"}
      title={"Privacy"}
      description={"How information is used across the website and simulator."}
    >
      <DocSection title="Simulation and local storage">
        <p>
          Simulation requests are sent to the simulation service to compute
          images, contours, and metrics. The app also uses browser storage for
          preferences, saved scenarios, and a client identifier. Clearing
          browser storage can remove locally saved work.
        </p>
      </DocSection>
      <DocSection title="Accounts and service operation">
        <p>
          When sign-in is enabled, Clerk provides authentication. Account
          identifiers, simulation usage counters, and service logs support
          access control, usage limits, reliability, and support. When paid
          billing is enabled, Stripe handles payment and subscription
          management.
        </p>
      </DocSection>
      <DocSection title="Analytics and advertising">
        <p>
          The website includes Google Analytics. Free-tier pages may also
          display advertising through Google AdSense when enabled. These
          services may process identifiers, cookies, and information about
          visits or interactions under their own privacy policies.
        </p>
        <p>
          Learn more from{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Google
          </a>
          ,{" "}
          <a
            href="https://clerk.com/legal/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Clerk
          </a>
          , and{" "}
          <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
            Stripe
          </a>
          .
        </p>
      </DocSection>
      <DocSection title="Questions and requests">
        <p>
          For privacy questions or account-related requests, email{" "}
          <a href="mailto:mincheol.chris.lee@gmail.com">
            mincheol.chris.lee@gmail.com
          </a>
          . Describe the request and include the account email if relevant.
        </p>
      </DocSection>
    </MarketingDocumentA>
  );
}
