import "../site.css";
import "../site-mono.css";
import "../site-docs.css";
import { PRO_MONTHLY_USD, PRO_ANNUAL_USD } from "../../lib/marketing";
import {
  FREE_SWEEP_POINTS,
  PRO_FOUNDING_MONTHLY_USD,
  PRO_FOUNDING_MONTHS,
  PRO_FOUNDING_SEATS,
  PRO_SWEEP_POINTS,
  PRO_TRIAL_DAYS,
} from "../../components/site/pricing";
import {
  DocSectionA as DocSection,
  MarketingDocumentA,
  docMetadataA,
} from "../../components/site/DocsA";

export const metadata = docMetadataA(
  "Access & billing",
  "Free access is available now. Pro is in closed beta, with no public subscription checkout on this site.",
  "/billing-policy",
);
export default function Page() {
  return (
    <MarketingDocumentA
      eyebrow={"Access & billing"}
      title={"Access & billing"}
      description={
        "Free access is available now. Pro is in closed beta, with no public subscription checkout on this site."
      }
    >
      <DocSection title="Current access">
        <p>
          The Free plan is open for exploration. Pro beta access is arranged by
          contacting{" "}
          <a href="mailto:mincheol.chris.lee@gmail.com?subject=litopc%20Pro%20beta%20access">
            mincheol.chris.lee@gmail.com
          </a>
          . A Research subscription is not currently offered.
        </p>
        <p>
          Usage allowances and enabled features are shown in the simulator
          account panel. They may change during beta.
        </p>
      </DocSection>
      <DocSection title="Planned Pro pricing">
        <p>
          Pro is planned at ${PRO_MONTHLY_USD} per month or ${PRO_ANNUAL_USD}{" "}
          per year, in USD. These are launch prices shown for planning, not an
          active subscription offer. Pro access is currently arranged through
          the private beta.
        </p>
        <p>
          When checkout opens, a new Pro subscription starts with a{" "}
          {PRO_TRIAL_DAYS}-day free trial. The first {PRO_FOUNDING_SEATS}{" "}
          accounts pay a founding price of ${PRO_FOUNDING_MONTHLY_USD} per month
          for their first {PRO_FOUNDING_MONTHS} months on the monthly plan; the
          annual price is not discounted.
        </p>
        <p>
          Free includes DUV and EUV simulation with mask correction, interactive
          3D, parameter sweeps of {FREE_SWEEP_POINTS} points, custom masks of up
          to 5 rectangles, and 2D PNG and SVG export. Pro adds sweeps of up to{" "}
          {PRO_SWEEP_POINTS} points, custom masks of up to 48 rectangles with a
          mask library, CSV data export, high-resolution 2D and 3D PNG export,
          higher daily allowances, 200 saved scenarios, and no ads. Pro for
          classes is available on request.
        </p>
      </DocSection>
      <DocSection title="If paid billing is enabled">
        <p>
          Review the price, billing period, and included features shown at
          checkout before subscribing. Payments and subscription management use
          Stripe when enabled. No payment is collected from this landing page.
        </p>
      </DocSection>
      <DocSection title="Managing an existing subscription">
        <p>
          Where an active Stripe subscription exists, use the billing portal
          from the simulator account panel to manage payment details or cancel.
          Cancellation takes effect at the end of the current billing period;
          access continues until that period ends.
        </p>
      </DocSection>
      <DocSection title="Refunds and support">
        <p>
          Refund requests are considered case by case. For an unexpected charge,
          email{" "}
          <a href="mailto:mincheol.chris.lee@gmail.com">
            mincheol.chris.lee@gmail.com
          </a>{" "}
          with your account email and a description of the issue. Do not send
          card details.
        </p>
      </DocSection>
    </MarketingDocumentA>
  );
}
