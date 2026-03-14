import OpcLabRedirect from "./redirect";

export function generateStaticParams() {
  // Return base path only; client-side redirect handles /opclab/* → /litopc/*
  return [{}];
}

export default function Page() {
  return <OpcLabRedirect />;
}
