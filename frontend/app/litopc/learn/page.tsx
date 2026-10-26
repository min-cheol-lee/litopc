import { redirect } from "next/navigation";

/** "How OPC works" now opens the plain-language guide, whose tour is the former learn stage. */
export default function LearnPage() {
  redirect("/basics#tour");
}
