import { DanosClient } from "@/app/danos/DanosClient";
import { getDanosPageData } from "@/app/danos/get-data";
import { RouteModal } from "@/components/RouteModal";

export default function DanosModal() {
  const { dados, dadosClimada, dadosClimadaMun, dadosCotas, dadosMedidas, dadosExposicao } = getDanosPageData();
  return (
    <RouteModal hrefNovaGuia="/danos">
      <DanosClient dados={dados} dadosClimada={dadosClimada} dadosClimadaMun={dadosClimadaMun} dadosCotas={dadosCotas} dadosMedidas={dadosMedidas} dadosExposicao={dadosExposicao} />
    </RouteModal>
  );
}
