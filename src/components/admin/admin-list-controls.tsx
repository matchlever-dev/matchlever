"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AdminSortMode = "recent" | "score";

export type AdminListStatusOption = {
  value: string;
  label: string;
};

export type AdminListSortOption<T extends string = string> = {
  value: T;
  label: string;
};

const DEFAULT_SORT_OPTIONS: Array<AdminListSortOption<AdminSortMode>> = [
  { value: "recent", label: "Recent" },
  { value: "score", label: "Score" },
];

export function AdminListControls<TSort extends string = AdminSortMode>({
  sort,
  onSortChange,
  sortOptions,
  status,
  onStatusChange,
  statusOptions,
  keyword,
  onKeywordChange,
  keywordPlaceholder = "Search by keyword…",
}: {
  sort: TSort;
  onSortChange: (value: TSort) => void;
  /** Override default Recent/Score options (e.g. Job Openings). */
  sortOptions?: ReadonlyArray<AdminListSortOption<TSort>>;
  status: string;
  onStatusChange: (value: string) => void;
  statusOptions: AdminListStatusOption[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  keywordPlaceholder?: string;
}) {
  const options =
    sortOptions ??
    (DEFAULT_SORT_OPTIONS as ReadonlyArray<AdminListSortOption<TSort>>);
  const allowed = new Set(options.map((opt) => opt.value));
  const sortLabel =
    options.find((opt) => opt.value === sort)?.label ?? options[0]?.label ?? "Sort";
  const statusLabel =
    statusOptions.find((opt) => opt.value === status)?.label ?? status;

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="grid gap-1.5">
        <Label className="text-[11px] tracking-wide text-[#5B616B] uppercase">
          Sort
        </Label>
        <Select
          value={sort}
          onValueChange={(value) => {
            if (value && allowed.has(value as TSort)) {
              onSortChange(value as TSort);
            }
          }}
        >
          <SelectTrigger className="h-10 w-full bg-white">
            <SelectValue placeholder="Sort">{sortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[11px] tracking-wide text-[#5B616B] uppercase">
          Status
        </Label>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) onStatusChange(value);
          }}
        >
          <SelectTrigger className="h-10 w-full bg-white">
            <SelectValue placeholder="Status">{statusLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label className="text-[11px] tracking-wide text-[#5B616B] uppercase">
          Keyword
        </Label>
        <Input
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder={keywordPlaceholder}
          className="h-10 bg-white"
        />
      </div>
    </div>
  );
}

export function matchesKeyword(
  keyword: string,
  fields: Array<string | null | undefined>
): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}
