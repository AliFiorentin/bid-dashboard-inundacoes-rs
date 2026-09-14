import { MetodologiaContent } from "@/app/metodologia/MetodologiaContent";
import { getMetodologiaPageData } from "@/app/metodologia/get-data";
import { RouteModal } from "@/components/RouteModal";

export default function MetodologiaModal() {
  const { dadosClimada } = getMetodologiaPageData();
  return (
    <RouteModal hrefNovaGuia="/metodologia">
      <MetodologiaContent dadosClimada={dadosClimada} />
    </RouteModal>
  );
}
