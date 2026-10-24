/**
 * OPC in running text. The expansion is written out in plain prose
 * ("optical proximity correction, or OPC") and only the acronym is set
 * apart, in ink and one step heavier than the body, so it reads as the
 * term being defined rather than as a link or a heading.
 */
export function Opc() {
  return <strong className="pa-opc">OPC</strong>;
}

/** The expansion, kept as a component so every page spells it the same way. */
export function OpcName({ capital = false }: { capital?: boolean }) {
  return <span className="pa-opc-term">{capital ? "Optical proximity correction" : "optical proximity correction"}</span>;
}
