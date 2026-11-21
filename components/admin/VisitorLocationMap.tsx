"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Expand, Minus, Plus, X } from "lucide-react";
import worldMap from "world-atlas/countries-110m.json";

type LocationDatum = {
  name: string;
  value: number;
  pageviews?: number;
};

type Props = {
  locations: LocationDatum[];
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function displayCountry(value: string) {
  const trimmed = String(value || "Unknown").trim();
  if (/^[A-Z]{2}$/i.test(trimmed)) {
    try {
      return regionNames.of(trimmed.toUpperCase()) || trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function countryKey(value: string) {
  const normalized = displayCountry(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const aliases: Record<string, string> = {
    unitedstatesofamerica: "unitedstates",
    russianfederation: "russia",
    republicofkorea: "southkorea",
    korea: "southkorea",
    czechrepublic: "czechia",
    ivorycoast: "cotedivoire",
    unitedrepublicoftanzania: "tanzania",
  };
  return aliases[normalized] || normalized;
}

export default function VisitorLocationMap({ locations }: Props) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 12]);
  const [selected, setSelected] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const locationByCountry = useMemo(
    () =>
      new Map(
        locations.map((location) => [countryKey(location.name), location]),
      ),
    [locations],
  );
  const maximum = Math.max(1, ...locations.map((location) => location.value));
  const total = locations.reduce((sum, location) => sum + location.value, 0);
  const leading = locations[0];

  const changeZoom = (next: number) => {
    setZoom(Math.min(6, Math.max(1, next)));
  };

  const resetMap = () => {
    setZoom(1);
    setCenter([0, 12]);
    setSelected(null);
  };

  return (
    <section className="space-y-6" aria-labelledby="visitor-location-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-600">
            Live geography
          </p>
          <h2
            id="visitor-location-title"
            className="mt-2 text-2xl font-bold tracking-tight text-black"
          >
            Visitors by location
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Country-level Vercel Analytics data. No per-visitor location records
            are stored.
          </p>
        </div>
        <span className="w-fit rounded-full bg-zinc-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          {locations.length} {locations.length === 1 ? "country" : "countries"}
        </span>
      </div>

      <div
        className={
          fullscreen
            ? "fixed inset-3 z-[100] flex flex-col overflow-hidden rounded-[2rem] bg-[#09090b] p-4 shadow-2xl sm:inset-8 sm:p-6"
            : "overflow-hidden rounded-[2.5rem] bg-[#09090b] p-4 shadow-sm sm:p-6"
        }
      >
        <div className="flex items-center justify-between gap-4 px-2 pb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white">
              Global traffic
            </p>
            <p className="mt-1 text-[10px] text-zinc-500">
              Tap a highlighted country for details
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-white transition hover:border-lime-400 hover:text-lime-300"
            aria-label={
              fullscreen ? "Close full-screen map" : "Open full-screen map"
            }
          >
            {fullscreen ? <X size={18} /> : <Expand size={18} />}
          </button>
        </div>

        <div
          className={
            fullscreen
              ? "relative min-h-0 flex-1"
              : "relative h-[390px] sm:h-[500px]"
          }
        >
          <ComposableMap
            projection="geoEqualEarth"
            projectionConfig={{ scale: 155, center: [0, 4] }}
            className="h-full w-full"
            aria-label="World map showing storefront visitors by country"
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={({ coordinates, zoom: nextZoom }) => {
                if (coordinates) setCenter(coordinates);
                if (nextZoom) setZoom(nextZoom);
              }}
              minZoom={1}
              maxZoom={6}
            >
              <Geographies geography={worldMap as any}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryName = String(geo.properties?.name || "");
                    const location = locationByCountry.get(
                      countryKey(countryName),
                    );
                    const intensity = location ? location.value / maximum : 0;
                    const active = selected === countryKey(countryName);
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() =>
                          location && setSelected(countryKey(countryName))
                        }
                        fill={
                          location
                            ? active
                              ? "#d9ff7a"
                              : intensity > 0.55
                                ? "#a3ff12"
                                : intensity > 0.2
                                  ? "#78b82a"
                                  : "#4c7421"
                            : "#202024"
                        }
                        stroke="#34343a"
                        strokeWidth={0.45 / zoom}
                        style={{
                          outline: "none",
                          cursor: location ? "pointer" : "default",
                        }}
                        className="transition-colors hover:brightness-125 focus:brightness-125"
                        aria-label={
                          location
                            ? `${displayCountry(location.name)}: ${location.value.toLocaleString()} visitors`
                            : countryName
                        }
                      />
                    );
                  })
                }
              </Geographies>

              <Geographies geography={worldMap as any}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryName = String(geo.properties?.name || "");
                    const location = locationByCountry.get(
                      countryKey(countryName),
                    );
                    if (!location || countryName === "Antarctica") return null;
                    const coordinates = geoCentroid(geo as any) as [
                      number,
                      number,
                    ];
                    const radius =
                      (4 + 10 * Math.sqrt(location.value / maximum)) / zoom;
                    return (
                      <Marker
                        key={`marker-${geo.rsmKey}`}
                        coordinates={coordinates}
                      >
                        <circle
                          r={radius * 1.9}
                          fill="#a3ff12"
                          fillOpacity={0.14}
                          stroke="none"
                        />
                        <circle
                          r={radius}
                          fill="#b8ff3d"
                          fillOpacity={0.88}
                          stroke="#e9ffb4"
                          strokeWidth={1 / zoom}
                        />
                      </Marker>
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          <div className="absolute bottom-3 left-3 flex overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-xl backdrop-blur">
            <button
              type="button"
              onClick={() => changeZoom(zoom - 0.7)}
              className="flex h-11 w-11 items-center justify-center text-white transition hover:bg-zinc-800"
              aria-label="Zoom out"
            >
              <Minus size={17} />
            </button>
            <button
              type="button"
              onClick={() => changeZoom(zoom + 0.7)}
              className="flex h-11 w-11 items-center justify-center border-x border-zinc-800 text-white transition hover:bg-zinc-800"
              aria-label="Zoom in"
            >
              <Plus size={17} />
            </button>
            <button
              type="button"
              onClick={resetMap}
              className="h-11 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              Reset
            </button>
          </div>

          {!locations.length && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-full bg-zinc-950/90 px-4 py-3 text-xs font-semibold text-zinc-300">
                Country data will appear after storefront visits are recorded.
              </p>
            </div>
          )}
        </div>

        <div
          className="flex min-h-12 items-center border-t border-zinc-800 px-2 pt-4"
          aria-live="polite"
        >
          {selected && locationByCountry.get(selected) ? (
            <p className="text-sm font-semibold text-white">
              {displayCountry(locationByCountry.get(selected)!.name)}
              <span className="ml-2 text-lime-300">
                {locationByCountry.get(selected)!.value.toLocaleString()}{" "}
                visitors
              </span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              Drag to explore · pinch or use the controls to zoom
            </p>
          )}
        </div>
      </div>

      {locations.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
              Location insight
            </p>
            <h3 className="mt-4 text-xl font-bold text-black">
              {displayCountry(leading.name)} leads storefront traffic
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-500">
              It accounts for{" "}
              {total ? Math.round((leading.value / total) * 100) : 0}% of
              recorded country-level visitors in this period. Use this signal
              when prioritising delivery coverage and campaign targeting.
            </p>
          </div>

          <div className="rounded-[2rem] border border-zinc-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
              Top locations
            </p>
            <div className="mt-5 space-y-4">
              {locations.slice(0, 5).map((location, index) => (
                <div
                  key={`${location.name}-${index}`}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-black text-lime-300">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-semibold text-black">
                      {displayCountry(location.name)}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-zinc-500">
                    {location.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
