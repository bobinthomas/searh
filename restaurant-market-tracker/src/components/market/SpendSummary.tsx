"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp } from "lucide-react";
import type { PurchaseRecord } from "@/lib/types";
import { useMoney } from "@/components/shell/SettingsContext";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatShortDate } from "@/lib/dates";
import { DAY_NAMES } from "@/lib/types";

interface SpendItem {
  item_name: string;
  total: number;
  count: number;
}

export function SpendSummary({ canEdit }: { canEdit: boolean }) {
  const money = useMoney();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [summary, setSummary] = useState<SpendItem[]>([]);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const loadData = useCallback(async () => {
    const [purchasesRes, summaryRes] = await Promise.all([
      fetch(`/api/purchases?from=${from}T00:00:00Z&to=${to}T23:59:59Z`),
      fetch(`/api/purchases/summary?from=${from}T00:00:00Z&to=${to}T23:59:59Z`),
    ]);
    return {
      purchases: (purchasesRes.ok
        ? await purchasesRes.json()
        : []) as PurchaseRecord[],
      summary: (summaryRes.ok ? await summaryRes.json() : []) as SpendItem[],
    };
  }, [from, to]);

  // Used by event handlers after a mutation.
  const fetchData = useCallback(async () => {
    const next = await loadData().catch(() => null);
    if (next) {
      setPurchases(next.purchases);
      setSummary(next.summary);
    }
  }, [loadData]);

  useEffect(() => {
    let active = true;
    loadData()
      .then((next) => {
        if (!active) return;
        setPurchases(next.purchases);
        setSummary(next.summary);
      })
      .catch(() => {
        // silent
      });
    return () => {
      active = false;
    };
  }, [loadData]);

  const { confirm, confirmDialog } = useConfirmDialog();

  const deletePurchase = async (id: string) => {
    const ok = await confirm("Delete this purchase record?", {
      description: "Stock levels and totals will be adjusted.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    fetchData();
  };

  const grandTotal = summary.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={fetchData} variant="outline">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Spending Summary · Total: {money(grandTotal)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {summary.map((s) => (
                <div
                  key={s.item_name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{s.item_name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({s.count} purchase{s.count > 1 ? "s" : ""})
                    </span>
                  </div>
                  <Badge variant="secondary">{money(s.total)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History ({purchases.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No purchases recorded in this date range.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Market Day</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {formatShortDate(p.purchased_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.item_name}
                      </TableCell>
                      <TableCell>
                        {p.quantity} {p.item_unit}
                      </TableCell>
                      <TableCell>{money(p.unit_price)}</TableCell>
                      <TableCell className="font-medium">
                        {money(p.total_cost)}
                      </TableCell>
                      <TableCell>
                        {p.day_name != null
                          ? DAY_NAMES[Number(p.day_name)]
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                        {p.notes || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-destructive"
                            onClick={() => deletePurchase(p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {confirmDialog}
    </div>
  );
}
