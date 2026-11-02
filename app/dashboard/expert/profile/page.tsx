"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BackHomeBar from "../../_components/back-home-bar";
import {
  getCountries,
  getStatesByCountry,
  getCitiesByState,
} from "country-state-city-react";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type Country = { code: string; name: string };
// The package's State is { code, name } only — no countryCode.
type State = { code: string; name: string };
// The package's City is { name } — no stateCode/countryCode.
type City = { name: string };

/* ------------------------------------------------------------------ */
/* Timezone catalogue — mirrors default_timezone_for_country()        */
/* ------------------------------------------------------------------ */

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Africa/Lagos", label: "Africa/Lagos (West Africa Time)" },
  { value: "Africa/Accra", label: "Africa/Accra (GMT)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (East Africa Time)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (South Africa Standard Time)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (Eastern European Time)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (Western European Time)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Dublin", label: "Europe/Dublin (GMT/IST)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (Central European Time)" },
  { value: "Europe/Paris", label: "Europe/Paris (Central European Time)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (Central European Time)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (Central European Time)" },
  { value: "Europe/Rome", label: "Europe/Rome (Central European Time)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (Western European Time)" },
  { value: "America/New_York", label: "America/New_York (Eastern Time)" },
  { value: "America/Toronto", label: "America/Toronto (Eastern Time)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (Gulf Standard Time)" },
  { value: "Asia/Riyadh", label: "Asia/Riyadh (Arabia Standard Time)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (India Standard Time)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (China Standard Time)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (Australian Eastern Time)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (New Zealand Time)" },
];

/* ------------------------------------------------------------------ */
/* Searchable Select                                                  */
/* ------------------------------------------------------------------ */

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <div style={{ position: "relative", marginBottom: "0.85rem" }}>
      <div
        onClick={() => !disabled && setOpen((p) => !p)}
        style={{
          ...inputStyle,
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ color: selected ? "inherit" : "var(--muted)" }}>
          {selected ? selected.label : placeholder}
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>▼</span>
      </div>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 20,
              background: "var(--white)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              marginTop: "0.25rem",
              maxHeight: "220px",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            }}
          >
            <input
              autoFocus
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.6rem",
                border: "none",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.82rem",
                outline: "none",
              }}
            />
            {filtered.length === 0 ? (
              <div style={{ padding: "0.6rem", fontSize: "0.8rem", color: "var(--muted)" }}>
                No matches.
              </div>
            ) : (
              filtered.slice(0, 200).map((o) => (
                <div
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    padding: "0.5rem 0.6rem",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    background: o.value === value ? "var(--gold-light)" : "transparent",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cream)")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      o.value === value ? "var(--gold-light)" : "transparent")
                  }
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExpertProfilePage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [countryCode, setCountryCode] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [regionName, setRegionName] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [timezoneConfirmed, setTimezoneConfirmed] = useState(false);
  const [timezoneEdited, setTimezoneEdited] = useState(false);

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* ---------------------------------------------------------------- */
  /* Load                                                              */
  /* ---------------------------------------------------------------- */

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, country_code, region_code, region_name, city, timezone, timezone_confirmed")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Could not load your profile.");
      setLoading(false);
      return;
    }

    if (profile.role !== "expert") {
      router.push("/dashboard");
      return;
    }

    setCountryCode(profile.country_code || "");
    setRegionCode(profile.region_code || "");
    setRegionName(profile.region_name || "");
    setCity(profile.city || "");
    setTimezone(profile.timezone || "");
    setTimezoneConfirmed(profile.timezone_confirmed || false);

    setCountries(getCountries() as unknown as Country[]);

    if (profile.country_code) {
      setRegions(getStatesByCountry(profile.country_code) as unknown as State[]);
    }
    if (profile.country_code && profile.region_code) {
      setCities(
        getCitiesByState(profile.country_code, profile.region_code) as unknown as City[]
      );
    }

    if (!profile.timezone) {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const match = TIMEZONE_OPTIONS.find((o) => o.value === detected);
        if (match) setTimezone(match.value);
      } catch {
        // ignore — expert will pick manually
      }
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------------------------- */
  /* Handlers                                                          */
  /* ---------------------------------------------------------------- */

  function onCountryChange(code: string) {
    setCountryCode(code);
    setRegionCode("");
    setRegionName("");
    setCity("");
    setSuccess("");

    if (!code) {
      setRegions([]);
      setCities([]);
      return;
    }

    const states = getStatesByCountry(code) as unknown as State[];
    setRegions(states);
    setCities([]);

    const suggestion = suggestTimezoneForCountry(code);
    if (suggestion && !timezoneConfirmed) {
      setTimezone(suggestion);
      setTimezoneEdited(false);
    }
  }

  function onRegionChange(code: string) {
    setRegionCode(code);
    const match = regions.find((r) => r.code === code);
    setRegionName(match?.name || "");
    setCity("");
    setSuccess("");

    if (!code) {
      setCities([]);
      return;
    }
    setCities(getCitiesByState(countryCode, code) as unknown as City[]);
  }

  function onCityChange(name: string) {
    setCity(name);
    setSuccess("");
  }

  function onTimezoneChange(value: string) {
    setTimezone(value);
    setTimezoneEdited(true);
    setTimezoneConfirmed(false);
    setSuccess("");
  }

  /* ---------------------------------------------------------------- */
  /* Save                                                              */
  /* ---------------------------------------------------------------- */

  async function save() {
    setError("");
    setSuccess("");

    if (!userId) return;

    if (!countryCode) {
      setError("Please select your country.");
      return;
    }
    if (!timezone) {
      setError("Please select your timezone.");
      return;
    }
    if (!TIMEZONE_OPTIONS.some((o) => o.value === timezone)) {
      setError("Please select a valid timezone from the list.");
      return;
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      country_code: countryCode,
      region_code: regionCode || null,
      region_name: regionName || null,
      city: city || null,
      timezone,
      timezone_confirmed: timezoneConfirmed,
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError("Save failed: " + updateError.message);
      return;
    }

    setSuccess("Location saved.");
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>
        Loading…
      </div>
    );
  }

  const countryOptions = countries.map((c) => ({
    value: c.code,
    label: `${c.name} (${c.code})`,
  }));

  const regionOptions = regions.map((r) => ({
    value: r.code,
    label: r.name,
  }));

  const cityOptions = cities.map((c) => ({
    value: c.name,
    label: c.name,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", padding: "2rem 5%" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <BackHomeBar backHref="/dashboard/expert" backLabel="Back to Dashboard" />

        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.6rem",
            marginBottom: "0.5rem",
          }}
        >
          My Location
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          This information is used internally to route tasks and schedule meetings.
          It is never shown to clients and does not affect your eligibility or ranking.
        </p>

        <div style={cardStyle}>
          <div style={labelStyle}>Country *</div>
          <SearchableSelect
            options={countryOptions}
            value={countryCode}
            onChange={onCountryChange}
            placeholder="Select your country…"
          />

          {countryCode && (
            <>
              <div style={labelStyle}>State / Province / Region</div>
              <SearchableSelect
                options={regionOptions}
                value={regionCode}
                onChange={onRegionChange}
                placeholder={regions.length ? "Select region…" : "No regions available"}
                disabled={regions.length === 0}
              />
            </>
          )}

          {regionCode && (
            <>
              <div style={labelStyle}>City</div>
              <SearchableSelect
                options={cityOptions}
                value={city}
                onChange={onCityChange}
                placeholder={cities.length ? "Select city…" : "No cities available"}
                disabled={cities.length === 0}
              />
            </>
          )}
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Timezone *</div>
          <SearchableSelect
            options={TIMEZONE_OPTIONS}
            value={timezone}
            onChange={onTimezoneChange}
            placeholder="Select your timezone…"
          />

          {timezone && (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.82rem",
                marginTop: "0.5rem",
              }}
            >
              <input
                type="checkbox"
                checked={timezoneConfirmed}
                onChange={(e) => {
                  setTimezoneConfirmed(e.target.checked);
                  setSuccess("");
                }}
              />
              I confirm this is my timezone
            </label>
          )}

          {timezone && !timezoneConfirmed && (
            <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.35rem" }}>
              {timezoneEdited
                ? "Tick the box above to confirm your timezone."
                : "This was suggested from your country. Confirm or change it above."}
            </p>
          )}
        </div>

        {error && (
          <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ color: "#1e8449", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
            {success}
          </p>
        )}

        <button
          onClick={save}
          disabled={saving}
          style={{
            background: "var(--gold)",
            color: "var(--ink)",
            border: "none",
            padding: "0.7rem 1.5rem",
            borderRadius: "6px",
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Location"}
        </button>

        <p style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "1rem" }}>
          Payout and bank details are managed separately under Payout Details and are
          never mixed with your physical location.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function suggestTimezoneForCountry(code: string): string | null {
  const map: Record<string, string> = {
    NG: "Africa/Lagos",
    GH: "Africa/Accra",
    KE: "Africa/Nairobi",
    ZA: "Africa/Johannesburg",
    EG: "Africa/Cairo",
    MA: "Africa/Casablanca",
    GB: "Europe/London",
    IE: "Europe/Dublin",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    NL: "Europe/Amsterdam",
    ES: "Europe/Madrid",
    IT: "Europe/Rome",
    PT: "Europe/Lisbon",
    US: "America/New_York",
    CA: "America/Toronto",
    AE: "Asia/Dubai",
    SA: "Asia/Riyadh",
    IN: "Asia/Kolkata",
    CN: "Asia/Shanghai",
    AU: "Australia/Sydney",
    NZ: "Pacific/Auckland",
  };
  return map[code] || null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "0.85rem",
  background: "var(--white)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--white)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "1.25rem",
  marginBottom: "1rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.82rem",
  fontWeight: 600,
  marginBottom: "0.4rem",
};