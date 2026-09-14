import Image from "next/image";

/**
 * Selo de logos (BID/GPEA/CIEX/IPH) para o canto direito dos headers escuros
 * de /danos e /metodologia -- mesmo chip branco usado no WelcomeModal.
 */
export function HeaderLogos() {
  return (
    <div className="hidden sm:flex items-center gap-2 shrink-0 print:hidden">
      {/* Caixa branca do mesmo tamanho para as 4 -- BID/GPEA são bem mais
          largas que altas e CIEX/IPH mais quadradas, então só igualar a
          altura deixava essas duas com espaço visual menor. `fill` +
          object-contain (em vez de w-auto/h-auto) é o jeito confiável de
          encaixar logos de proporções bem diferentes numa caixa fixa com
          next/image -- w-auto/h-auto por si só cortava a CIEX. */}
      <div className="relative bg-white rounded-md h-9 w-16 p-1">
        <Image src="/BID.png" alt="BID" fill className="object-contain p-1" />
      </div>
      <div className="relative bg-white rounded-md h-9 w-16 p-1">
        <Image src="/GPEA.png" alt="GPEA" fill className="object-contain p-1" />
      </div>
      <div className="relative bg-white rounded-md h-9 w-16 p-1">
        <Image src="/CIEX2.png" alt="CIEX" fill className="object-contain p-1" />
      </div>
      <div className="relative bg-white rounded-md h-9 w-16 p-1">
        <Image src="/IPH.jpg" alt="IPH" fill className="object-contain p-1 rounded-sm" />
      </div>
    </div>
  );
}
