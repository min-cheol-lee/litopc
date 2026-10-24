import "../site.css";
import "../site-mono.css";
import "../site-docs.css";
import Link from "next/link";
import {
  CreatorLinksA,
  DocSectionA as DocSection,
  MarketingDocumentA,
  docMetadataA,
} from "../../components/site/DocsA";
import { ROUTES } from "../../components/site/routes";
import { Wordmark } from "../../components/site/ShellA";
import { SUPPORT_EMAIL } from "../../lib/marketing";

export const metadata = docMetadataA(
  "About",
  "litopc is an independent project by Min-Cheol Lee, an OPC engineer with a Ph.D. in Physics.",
  "/about",
);
export default function AboutPage() {
  return (
    <MarketingDocumentA
      eyebrow="About"
      title="Min-Cheol Lee"
      description="OPC engineer. Ph.D. in Physics."
      action={false}
    >
      <div className="pa-doc-prose" data-reveal>
        <p>
          I build software for optical proximity correction. My background is in
          physics, with research spanning optical spectroscopy and quantum
          materials.
        </p>
        <p>
          <Wordmark /> is my independent project: a way to make lithography easier to
          explore, explain, and see. It brings mask geometry, simulated light
          intensity, and correction into one browser workspace.
        </p>
        <CreatorLinksA />
        <p>
          For the assumptions behind the simulation, read{" "}
          <Link href={ROUTES.modelSimulation}>the simulation guide</Link>.
        </p>
      </div>
      <DocSection id="contact" title="Get in touch">
        <p>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          Feedback, Pro beta access, teaching or team use: tell me what you
          would like to do. For a problem report, include the pattern, the
          optical preset, the steps and your browser, and leave out confidential
          designs. Billing questions follow the{" "}
          <Link href={ROUTES.billingPolicy}>access and billing policy</Link>.
        </p>
      </DocSection>
    </MarketingDocumentA>
  );
}
