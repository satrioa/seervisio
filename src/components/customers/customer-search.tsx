"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, UserPlus, ChevronDown, Check, Wrench, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  type CustomerMock,
  searchCustomers,
  formatCurrency,
} from "@/components/customers/customer-data";

/* ─── Customer Search ─── */

interface CustomerSearchProps {
  onSelect: (customer: CustomerMock | null) => void;
  selectedCustomer: CustomerMock | null;
  /** Called when user wants to create a new customer with entered text */
  onStartNewCustomer: (searchText: string) => void;
  /** Current manual input values (used when no customer selected) */
  manualName: string;
  manualPhone: string;
  manualAddress: string;
  onManualChange: (field: "name" | "phone" | "address", value: string) => void;
}

export function CustomerSearch({
  onSelect,
  selectedCustomer,
  onStartNewCustomer,
  manualName,
  manualPhone,
  manualAddress,
  onManualChange,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerMock[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Search as user types
  useEffect(() => {
    if (query.trim().length >= 1) {
      setResults(searchCustomers(query));
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle customer selection
  const handleSelect = useCallback(
    (customer: CustomerMock) => {
      onSelect(customer);
      setQuery(customer.name);
      setIsOpen(false);
      setIsManualMode(false);
    },
    [onSelect],
  );

  // Switch to manual / new customer mode
  const handleNewCustomer = useCallback(() => {
    onSelect(null);
    onStartNewCustomer(query);
    setIsManualMode(true);
    setIsOpen(false);
    // Set name from search query
    if (query && !manualName) {
      onManualChange("name", query);
    }
  }, [query, manualName, onSelect, onStartNewCustomer, onManualChange]);

  // Clear selection
  const handleClear = useCallback(() => {
    onSelect(null);
    setQuery("");
    setIsManualMode(false);
    setResults([]);
  }, [onSelect]);

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-foreground">
        Cari Pelanggan
      </label>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Cari nama atau nomor HP..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedCustomer) onSelect(null);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="h-9 pl-8 pr-8 text-xs"
        />
        {selectedCustomer && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="size-3.5 rotate-180" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="relative z-50"
        >
          <div className="absolute top-0 w-full overflow-hidden rounded-lg border bg-card shadow-lg">
            {/* Results */}
            <div className="max-h-48 overflow-y-auto">
              {results.length > 0 ? (
                results.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {customer.name}
                        </span>
                        {customer.activeServices > 0 && (
                          <Badge variant="outline" className="gap-0.5 border-blue-200 bg-blue-50 px-1 py-0 text-[9px] text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
                            <Wrench className="size-2.5" />
                            {customer.activeServices}
                          </Badge>
                        )}
                        {customer.activeWarranties > 0 && (
                          <Badge variant="outline" className="gap-0.5 border-green-200 bg-green-50 px-1 py-0 text-[9px] text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
                            <ShieldCheck className="size-2.5" />
                            Garansi
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{customer.phone}</span>
                        <span>·</span>
                        <span>{customer.totalServices} servis</span>
                        {customer.lastServiceAt && (
                          <>
                            <span>·</span>
                            <span>Terakhir {new Date(customer.lastServiceAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-medium tabular-nums text-foreground">
                        {formatCurrency(customer.totalSpend)}
                      </div>
                    </div>
                  </button>
                ))
              ) : query.trim().length >= 2 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Pelanggan tidak ditemukan
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNewCustomer}
                    className="mt-2 h-7 gap-1 text-[10px]"
                  >
                    <UserPlus className="size-3" />
                    Buat pelanggan baru "{query}"
                  </Button>
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Ketik minimal 2 karakter untuk mencari
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Customer Summary */}
      {selectedCustomer && (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                {selectedCustomer.name}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={handleClear}
            >
              Ganti
            </Button>
          </div>
          <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span>{selectedCustomer.phone}</span>
            <span>·</span>
            <span>{selectedCustomer.totalServices} servis</span>
            <span>·</span>
            <span>{formatCurrency(selectedCustomer.totalSpend)}</span>
          </div>
        </div>
      )}

      {/* Manual input section (visible when no customer selected) */}
      {(!selectedCustomer || isManualMode) && (
        <div className="space-y-2 pt-1">
          <Separator />
          <p className="text-[10px] font-medium text-muted-foreground">
            {isManualMode ? "Data Pelanggan Baru" : "Atau isi manual:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Nama *</label>
              <Input
                value={manualName}
                onChange={(e) => onManualChange("name", e.target.value)}
                placeholder="Nama pelanggan"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">No. HP *</label>
              <Input
                value={manualPhone}
                onChange={(e) => onManualChange("phone", e.target.value)}
                placeholder="081234567890"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Alamat</label>
            <Input
              value={manualAddress}
              onChange={(e) => onManualChange("address", e.target.value)}
              placeholder="Alamat pelanggan (opsional)"
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
}
