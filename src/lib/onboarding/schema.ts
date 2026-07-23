export type TimezoneOption = {
  value: string;
  label: string;
  offsetMinutes: number;
};

/** Common IANA-style labels with UTC offsets for Phase 1 preferences. */
export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: "Pacific/Honolulu", label: "Hawaii (UTC−10)", offsetMinutes: -600 },
  { value: "America/Anchorage", label: "Alaska (UTC−9)", offsetMinutes: -540 },
  { value: "America/Los_Angeles", label: "US Pacific (UTC−8)", offsetMinutes: -480 },
  { value: "America/Denver", label: "US Mountain (UTC−7)", offsetMinutes: -420 },
  { value: "America/Chicago", label: "US Central (UTC−6)", offsetMinutes: -360 },
  { value: "America/New_York", label: "US Eastern (UTC−5)", offsetMinutes: -300 },
  { value: "America/Sao_Paulo", label: "São Paulo (UTC−3)", offsetMinutes: -180 },
  { value: "UTC", label: "UTC", offsetMinutes: 0 },
  { value: "Europe/London", label: "London (UTC+0)", offsetMinutes: 0 },
  { value: "Europe/Berlin", label: "Central Europe (UTC+1)", offsetMinutes: 60 },
  { value: "Europe/Athens", label: "Eastern Europe (UTC+2)", offsetMinutes: 120 },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)", offsetMinutes: 240 },
  { value: "Asia/Kolkata", label: "India (UTC+5:30)", offsetMinutes: 330 },
  { value: "Asia/Singapore", label: "Singapore (UTC+8)", offsetMinutes: 480 },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)", offsetMinutes: 540 },
  { value: "Australia/Sydney", label: "Sydney (UTC+10)", offsetMinutes: 600 },
];

export const VISA_OPTIONS = [
  { value: "none", label: "No visa sponsorship needed" },
  { value: "us_h1b", label: "US — H-1B" },
  { value: "us_opt", label: "US — OPT / STEM OPT" },
  { value: "us_green_card", label: "US — Green Card / Citizen" },
  { value: "eu_work", label: "EU — Work authorization" },
  { value: "uk_skilled", label: "UK — Skilled Worker" },
  { value: "ca_work", label: "Canada — Work permit / PR" },
  { value: "other", label: "Other / Discuss" },
] as const;

export const LOCATION_MODES = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
] as const;
