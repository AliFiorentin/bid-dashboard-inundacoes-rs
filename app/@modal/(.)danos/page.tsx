import { DanosClient } from "@/app/danos/DanosClient";
import { getDanosPageData } from "@/app/danos/get-data";
import { RouteModal } from "@/components/RouteModal";

export default function DanosModal() {
  const { dados, dadosClimada } = getDanosPageData();
  return (
    <RouteModal hrefNovaGuia="/danos">
      <DanosClient dados={dados} dadosClimada={dadosClimada} />
    </RouteModal>
  );
}
