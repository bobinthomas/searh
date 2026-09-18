"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { putJson } from "@/lib/api-client";
import {
  CURRENCIES,
  TIMEZONES,
  type AppSettings,
} from "@/lib/settings";
import { useSettings } from "@/components/shell/SettingsContext";

const WEEK_STARTS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function SettingsScreen() {
  const current = useSettings();
  const [form, setForm] = useState<AppSettings>(current);
  const [loading, setLoading] = useState(false);
  // Track which settings snapshot the form was seeded from, so external
  // changes (e.g. after save) re-seed it during render, not in an effect.
  const [seededFrom, setSeededFrom] = useState(current);
  if (seededFrom !== current) {
    setSeededFrom(current);
    setForm(current);
  }

  const set = (key: keyof AppSettings, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setLoading(true);
    const res = await putJson<AppSettings>("/api/settings", form);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.data.error || "Could not save");
      return;
    }
    toast.success("Settings saved — refresh to see them everywhere");
    setForm(res.data);
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(current);

  return (
    <div className="space-y-4">
      <Section title="Company" hint="Shown in the header and on printable reports.">
        <div className="space-y-2">
          <Label htmlFor="company_name">Name</Label>
          <Input
            id="company_name"
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company_address">Address</Label>
          <Input
            id="company_address"
            value={form.company_address}
            onChange={(e) => set("company_address", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_phone">Phone</Label>
            <Input
              id="company_phone"
              value={form.company_phone}
              onChange={(e) => set("company_phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_tax">Tax number</Label>
            <Input
              id="company_tax"
              placeholder="ABN / GST / VAT"
              value={form.company_tax_number}
              onChange={(e) => set("company_tax_number", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Region" hint="How money and dates are shown, for everyone.">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Week starts on</Label>
            <Select value={form.week_start} onValueChange={(v) => set("week_start", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_STARTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Input
              id="language"
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Low stock" hint="Which items raise alerts, and how early.">
        <div className="flex items-center justify-between">
          <div>
            <Label>Low stock alerts</Label>
            <p className="text-xs text-muted-foreground">
              Auto-add items at or below their reorder level to the next list.
            </p>
          </div>
          <Switch
            checked={form.low_stock_alerts === "1"}
            onCheckedChange={(v) => set("low_stock_alerts", v ? "1" : "0")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="banner_days">Look-ahead (days)</Label>
          <Input
            id="banner_days"
            type="number"
            min="0"
            max="90"
            value={form.low_stock_banner_days}
            onChange={(e) => set("low_stock_banner_days", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Flag items projected to run out within this many days, based on recent
            purchase rates.
          </p>
        </div>
      </Section>

      <Section
        title="Approvals"
        hint="Whether lists must pass the admin before purchase."
      >
        <div className="flex items-center justify-between">
          <div>
            <Label>Require admin approval</Label>
            <p className="text-xs text-muted-foreground">
              Store manager sends each list to you before buying.
            </p>
          </div>
          <Switch
            checked={form.require_approval === "1"}
            onCheckedChange={(v) => set("require_approval", v ? "1" : "0")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="auto_under">Auto-approve lists under</Label>
          <Input
            id="auto_under"
            type="number"
            min="0"
            step="0.01"
            value={form.auto_approve_under}
            onChange={(e) => set("auto_approve_under", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Estimated cost below this amount skips your approval. 0 disables.
            Estimates use each item&apos;s last recorded price.
          </p>
        </div>
      </Section>

      <div className="sticky bottom-16 flex justify-end">
        <Button onClick={save} disabled={loading || !dirty} className="shadow-lg">
          {loading ? "Saving…" : dirty ? "Save settings" : "Saved"}
        </Button>
      </div>
    </div>
  );
}
