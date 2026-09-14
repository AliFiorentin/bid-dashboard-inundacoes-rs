import { redirect } from "next/navigation";

// A página CLIMADA foi incorporada como aba dentro de /danos (Danos & Risco de
// Inundação) -- ver app/danos/DanosClient.tsx. Mantido como redirect para não
// quebrar links/bookmarks antigos para /climada.
export default function ClimadaPage() {
  redirect("/danos?aba=climada");
}
