import "../site.css";
import "../site-mono.css";
import "../site-docs.css";
import Link from "next/link";
import {
  DocSectionA as DocSection,
  MarketingDocumentA,
  docMetadataA,
} from "../../components/site/DocsA";
import { ROUTES } from "../../components/site/routes";
import { Wordmark } from "../../components/site/ShellA";

export const metadata = docMetadataA(
  "Terms of use",
  "Terms for using litopc’s website, simulator, and available account features.",
  "/terms",
);
export default function Page() {
  return (
    <MarketingDocumentA
      eyebrow={"Terms of use"}
      title={"Terms of use"}
      description={
        "Terms for using litopc’s website, simulator, and available account features."
      }
    >
      <DocSection title="Acceptable use">
        <p>
          You may use <Wordmark /> to learn about lithography, explore OPC behavior,
          compare parameters, and generate figures. Do not attempt unauthorized
          access, abuse the service, scrape the infrastructure, or automate
          misuse.
        </p>
      </DocSection>
      <DocSection title="Interpreting results">
        <p>
          Outputs are approximations from a simplified model. <Wordmark /> is not a
          manufacturing sign-off platform and should not be the sole basis for
          fabrication, process certification, or compliance decisions. Read{" "}
          <Link href={ROUTES.modelSimulation}>the model scope</Link> when
          evaluating results.
        </p>
      </DocSection>
      <DocSection title="Accounts and access">
        <p>
          Available features and usage allowances depend on the current account
          state. Sign-in, when enabled, uses Clerk. Any enabled paid
          subscription is managed through Stripe and the{" "}
          <Link href={ROUTES.billingPolicy}>billing policy</Link>.
        </p>
      </DocSection>
      <DocSection title="Availability and responsibility">
        <p>
          The service is provided on an as-available basis, without warranty.
          Features, models, and outputs may change as the product develops.
          <Wordmark /> is not liable for decisions made from simulator output.
        </p>
      </DocSection>
      <DocSection title="Updates and contact">
        <p>
          These terms may change as the product evolves. Continued use after a
          revision constitutes acceptance of the updated terms. Questions can be
          sent to{" "}
          <a href="mailto:mincheol.chris.lee@gmail.com">
            mincheol.chris.lee@gmail.com
          </a>
          .
        </p>
      </DocSection>
    </MarketingDocumentA>
  );
}
