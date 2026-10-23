import { useId } from "react";

const streets = [
  "M0 105H310L365 145H720L780 105H1200",
  "M0 235H300L355 240H1200",
  "M0 350H290L350 300H740L790 345H1200",
  "M85 0V180L160 235V480",
  "M270 0V170L230 235V480",
  "M540 0V180L575 240V480",
  "M740 0V480",
  "M880 0V190L880 240L950 270V480",
  "M1080 0V480",
  "M0 430H330L370 380H650L710 430H1200",
  "M640 0V105L690 145H1010V200H1200",
  "M920 0V145H1010",
  "M650 300V430",
];
const original = "M1010 145H920Q880 145 880 190V240H740V300H650V370";
const alternative = "M820 240H920Q950 240 950 270V345H1035";

export function RouteMap({ compact = false }: { compact?: boolean }) {
  const pattern = `city-blocks-${useId().replace(/:/g, "")}`;
  return (
    <div className={`route-map ${compact ? "compact" : ""}`}>
      <svg className="route-map-canvas" viewBox="0 0 1200 480" role="img"
        aria-label="Illustrative Ahmedabad city map with the Sabarmati river, neighbourhoods and fictional shipment routes from Naroda to receiving partners. Not for navigation.">
        <defs>
          <pattern id={pattern} width="88" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
            <rect width="88" height="72" fill="#efeee7" />
            <rect x="6" y="6" width="32" height="26" rx="3" fill="#e7e6de" />
            <rect x="44" y="6" width="37" height="26" rx="3" fill="#e9e8df" />
            <rect x="6" y="38" width="75" height="27" rx="3" fill="#e8e7df" />
            <path d="M0 0H88M0 0V72M40 0V36M0 35H88" stroke="#faf9f3" strokeWidth="4" />
          </pattern>
        </defs>
        <rect width="1200" height="480" fill={`url(#${pattern})`} />
        <g className="map-parks">
          <path d="M66 55H175V150H120L66 120Z" />
          <path d="M570 30H690V85H615Z" />
          <path d="M460 285H530V405H480Z" />
          <path d="M1020 385H1160V458H1050Z" />
          <path d="M790 355H855V425H790Z" />
        </g>
        <path className="city-river-bank" d="M430 -25C380 55 463 100 422 180S395 285 433 350S467 440 435 510" />
        <path className="city-river" d="M430 -25C380 55 463 100 422 180S395 285 433 350S467 440 435 510" />
        <g className="city-street-casing">{streets.map((d) => <path d={d} key={d} />)}</g>
        <g className="city-streets">{streets.map((d) => <path d={d} key={d} />)}</g>
        <path className="city-ring-casing" d="M-20 35Q260 65 390 25T760 38Q980 80 1220 25" />
        <path className="city-ring-road" d="M-20 35Q260 65 390 25T760 38Q980 80 1220 25" />
        <path className="city-rail" d="M660 -20V125Q660 170 700 200L710 400L755 500" />
        <g className="city-districts">
          <text x="183" y="175">VADAJ</text>
          <text x="130" y="306">NAVRANGPURA</text>
          <text x="532" y="192">SHAHIBAG</text>
          <text x="757" y="192">ASARWA</text>
          <text x="1035" y="95">NARODA</text>
          <text x="815" y="401">BAPUNAGAR</text>
          <text x="485" y="442">OLD CITY</text>
        </g>
        <g className="city-road-labels">
          <text x="143" y="43" transform="rotate(-3 143 43)">Sardar Patel Ring Road</text>
          <text x="1090" y="222">Naroda Road</text>
          <text x="323" y="320" transform="rotate(-84 323 320)">Sabarmati</text>
          <text x="555" y="66">Airport area</text>
        </g>
        <path className="map-route-halo" d={original} />
        <path className="map-original" d={original} />
        <path className="map-route-halo" d={alternative} />
        <path className="map-alternative" d={alternative} />
        <g className="map-markers">
          <circle cx="1010" cy="145" r="8" className="map-node" />
          <circle cx="1035" cy="345" r="8" className="map-node" />
          <circle cx="650" cy="370" r="8" className="map-node pale" />
          <circle cx="820" cy="240" r="17" className="map-warning" />
        </g>
        <g className="map-label">
          <text x="1010" y="122" textAnchor="middle">Naroda hub</text>
          <text x="820" y="211" textAnchor="middle">Delay checkpoint</text>
          <text x="1035" y="378" textAnchor="middle">Eastside center</text>
          <text x="650" y="407" textAnchor="middle">Central market</text>
        </g>
        <g transform="translate(807 232)" className="map-truck" aria-hidden="true">
          <path d="M1 1H16V13H1ZM16 5H22L26 10V13H16" />
          <circle cx="6" cy="16" r="2" /><circle cx="21" cy="16" r="2" />
        </g>
        <g className="map-north" transform="translate(1158 72)" aria-hidden="true">
          <text x="0" y="-20" textAnchor="middle">N</text><path d="M0 -10V18M-5 -3L0 -10L5 -3" />
        </g>
      </svg>
      <span className="map-tag">Ahmedabad <span>Illustrative routes</span></span>
      {!compact && <div className="map-key">
        <span><i />Original route</span>
        <span><i className="alternative" />Nearby alternative</span>
      </div>}
    </div>
  );
}
