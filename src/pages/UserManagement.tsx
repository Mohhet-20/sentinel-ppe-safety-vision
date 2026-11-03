import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  enableUser,
  disableUser,
  type UserBase,
} from "@/lib/api-client";

const ROLE_OPTIONS = ["admin", "safety_lead", "supervisor", "viewer"] as const;

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserBase[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [current, setCurrent] = useState<UserBase | null>(null);

  // Form state
  const [form, setForm] = useState({ username: "", email: "", full_name: "", password: "", role: "viewer" });
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to load users", description: errorMessage(e, "Please try again.") });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  if (!isAdmin) return <Card><div className="p-6">Access denied</div></Card>;

  async function handleCreate() {
    try {
      await createUser({ username: form.username, email: form.email, password: form.password, role: form.role, full_name: form.full_name });
      setCreateOpen(false);
      setForm({ username: "", email: "", full_name: "", password: "", role: "viewer" });
      await refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Create failed", description: errorMessage(err, "Please try again.") });
    }
  }

  function openEdit(u: UserBase) {
    setCurrent(u);
    setForm({ username: u.username, email: u.email, full_name: u.full_name ?? "", password: "", role: u.role });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!current) return;
    try {
      await updateUser(current.id, { email: form.email, full_name: form.full_name, role: form.role });
      setEditOpen(false);
      setCurrent(null);
      await refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: errorMessage(err, "Please try again.") });
    }
  }

  function openDelete(u: UserBase) {
    setCurrent(u);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!current) return;
    try {
      await deleteUser(current.id);
      setDeleteOpen(false);
      setCurrent(null);
      await refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Delete failed", description: errorMessage(err, "Please try again.") });
    }
  }

  function openReset(u: UserBase) {
    setCurrent(u);
    setResetPasswordValue("");
    setResetOpen(true);
  }

  async function handleReset() {
    if (!current) return;
    try {
      await resetUserPassword(current.id, resetPasswordValue);
      setResetOpen(false);
      setCurrent(null);
      toast({ title: "Password reset", description: "The user's password was reset successfully." });
    } catch (err) {
      toast({ variant: "destructive", title: "Reset failed", description: errorMessage(err, "Please try again.") });
    }
  }

  async function toggleActive(u: UserBase) {
    try {
      if (u.is_active) await disableUser(u.id);
      else await enableUser(u.id);
      await refresh();
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: errorMessage(err, "Please try again.") });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display">User Management</h1>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setCreateOpen(true)}>Create User</Button>
          <Button variant="outline" onClick={refresh}>Refresh</Button>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-1/6">Username</th>
                <th className="w-1/4">Email</th>
                <th className="w-1/4">Full name</th>
                <th className="w-1/6">Role</th>
                <th className="w-1/12">Active</th>
                <th className="w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-6 text-center">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-6 text-center">No users</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="py-3">{u.username}</td>
                  <td className="py-3">{u.email}</td>
                  <td className="py-3">{u.full_name ?? "—"}</td>
                  <td className="py-3">{u.role}</td>
                  <td className="py-3">{u.is_active ? "Yes" : "No"}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => openReset(u)}>Reset</Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>{u.is_active ? "Disable" : "Enable"}</Button>
                      <Button size="sm" variant="destructive" onClick={() => openDelete(u)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>Create a new user and assign a role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Field label="Username"><input className="w-full rounded-md border border-border px-3 py-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
            <Field label="Email"><input className="w-full rounded-md border border-border px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Full name"><input className="w-full rounded-md border border-border px-3 py-2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Password"><input type="password" className="w-full rounded-md border border-border px-3 py-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue>{form.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update user details and role.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Field label="Username"><input disabled className="w-full rounded-md border border-border px-3 py-2 bg-muted" value={form.username} /></Field>
            <Field label="Email"><input className="w-full rounded-md border border-border px-3 py-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Full name"><input className="w-full rounded-md border border-border px-3 py-2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Field>
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue>{form.role}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a temporary password for the user.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Field label="New temporary password"><input type="password" className="w-full rounded-md border border-border px-3 py-2" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button onClick={handleReset}>Reset</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              {current ? `Delete user "${current.username}"? This cannot be undone.` : "This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
