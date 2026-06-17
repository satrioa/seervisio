"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { listAccountsAction, createAccountAction, updateAccountAction, toggleAccountActiveAction, deleteAccountAction } from "@/server/actions/account.actions";
import { useUserSession } from "@/hooks/useUserSession";

interface AccountRow {
  id: string;
  name: string;
  email: string;
  role: string;
  branchIds: string[];
  isActive: boolean;
  authUserId?: string | null;
}

export default function AccountsPageClient() {
  const pathname = usePathname();
  const brandSlug = pathname.split("/")[1];
  const { role } = useUserSession();

  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editAccount, setEditAccount] = useState<AccountRow | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const result = await listAccountsAction(brandSlug);
    if (result.success) {
      setAccounts(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  // ----- Form state -----
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("FRONTLINER");
  const [formBranches, setFormBranches] = useState<string[]>([]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormRole("FRONTLINER");
    setFormBranches([]);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const openEdit = (acc: AccountRow) => {
    setEditAccount(acc);
    setFormName(acc.name);
    setFormEmail(acc.email);
    setFormRole(acc.role as any);
    setFormBranches(acc.branchIds);
  };

  const handleSubmit = async () => {
    if (editAccount) {
      const res = await updateAccountAction(brandSlug, editAccount.id, {
        name: formName,
        email: formEmail,
        role: formRole as any,
        branchIds: formBranches,
      });
      if (res.success) await fetchAccounts();
      else setError(res.error);
    } else {
      const res = await createAccountAction(brandSlug, {
        name: formName,
        email: formEmail,
        role: formRole as any,
        branchIds: formBranches,
      });
      if (res.success) await fetchAccounts();
      else setError(res.error);
    }
    setShowCreate(false);
    setEditAccount(null);
  };

  const handleToggleActive = async (account: AccountRow, checked: boolean) => {
    const res = await toggleAccountActiveAction(brandSlug, account.id, checked);
    if (res.success) await fetchAccounts();
    else setError(res.error);
  };

  const handleDelete = async (account: AccountRow) => {
    if (!window.confirm(`Hapus akun ${account.name}?`)) return;
    const res = await deleteAccountAction(brandSlug, account.id);
    if (res.success) await fetchAccounts();
    else setError(res.error);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Akun</h1>
        <Button onClick={openCreate}>Tambah Akun</Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <Card key={acc.id} className="p-4">
              <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                <CardTitle className="text-lg">{acc.name}</CardTitle>
                <Badge variant={acc.isActive ? "default" : "secondary"}>{acc.isActive ? "Aktif" : "Nonaktif"}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{acc.email}</p>
                <p className="text-xs">Peran: <Badge>{acc.role}</Badge></p>
                <p className="text-xs">Cabang: {acc.branchIds.length > 0 ? acc.branchIds.join(", ") : "Semua"}</p>
                <div className="flex items-center justify-between mt-2">
                  <Switch checked={acc.isActive} onCheckedChange={(c) => handleToggleActive(acc, c)} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(acc)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(acc)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for create / edit */}
      <Dialog open={showCreate || !!editAccount} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditAccount(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccount ? "Edit Akun" : "Tambah Akun"}</DialogTitle>
            <DialogDescription>Isi detail akun.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Peran</Label>
              <Select value={formRole} onValueChange={(v) => setFormRole(v)}>
                <SelectTrigger id="role"><SelectValue placeholder="Pilih peran" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin Cabang</SelectItem>
                  <SelectItem value="FRONTLINER">Frontliner</SelectItem>
                  <SelectItem value="TECHNICIAN">Technician</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Branch multi‑select could be added here */}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>{editAccount ? "Simpan" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
