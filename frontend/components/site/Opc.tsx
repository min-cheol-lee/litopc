import { Fragment } from "react";

/**
 * OPC in running text. The expansion is written out in plain prose
 * ("optical proximity correction, or OPC") and only the acronym is set
 * apart, in the wordmark's typeface and lowercase like the wordmark, so it
 * reads as the second half of litopc rather than as a link or a heading.
 */
export function Opc() {
  return <strong className="pa-opc">opc</strong>;
}

/** The expansion, kept as a component so every page spells it the same way. */
export function OpcName({ capital = false }: { capital?: boolean }) {
  return <span className="pa-opc-term">{capital ? "Optical proximity correction" : "optical proximity correction"}</span>;
}

/** "lithography" with its first three letters in the wordmark's typeface, the first half of litopc. */
export function Lithography() {
  return (
    <span className="pa-lit-word">
      <span className="pa-lit">lit</span>hography
    </span>
  );
}

/** Plain copy from data files (pricing rows) with every "OPC" set as <Opc />. */
export function WithOpc({ text }: { text: string }) {
  const parts = text.split(/\bOPC\b/);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <Opc />}
          {part}
        </Fragment>
      ))}
    </>
  );
}
