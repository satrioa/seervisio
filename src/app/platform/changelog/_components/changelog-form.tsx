"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  Image,
  Eye,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import type {
  ChangelogVersion,
  ChangelogCategory,
  ChangelogStatus,
} from "@/types/changelog";
import { CATEGORY_LABEL, CATEGORY_EMOJI } from "@/types/changelog";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ChangelogCategory[];

const STATUS_OPTIONS: { value: ChangelogStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "scheduled", label: "Scheduled" },
];

interface ItemForm {
  id: string;
  category: string;
  title: string;
  description: string;
  mediaUrl: string;
}

interface FormData {
  version: string;
  slug: string;
  title: string;
  releaseDate: string;
  status: ChangelogStatus;
  featured: boolean;
  summary: string;
  coverImage: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  ctaText: string;
  ctaLink: string;
  items: ItemForm[];
}

function emptyForm(): FormData {
  const today = new Date().toISOString().split("T")[0];
  return {
    version: "",
    slug: "",
    title: "",
    releaseDate: today,
    status: "draft",
    featured: false,
    summary: "",
    coverImage: "",
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
    ctaText: "",
    ctaLink: "",
    items: [],
  };
}

function formFromRelease(release: ChangelogVersion): FormData {
  return {
    version: release.version,
    slug: release.slug,
    title: release.title,
    releaseDate: release.releaseDate.split("T")[0],
    status: release.status,
    featured: release.featured,
    summary: release.summary ?? "",
    coverImage: release.coverImage ?? "",
    metaTitle: release.metaTitle ?? "",
    metaDescription: release.metaDescription ?? "",
    ogImage: release.ogImage ?? "",
    ctaText: release.ctaText ?? "",
    ctaLink: release.ctaLink ?? "",
    items: release.items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description ?? "",
      mediaUrl: item.mediaUrl ?? "",
    })),
  };
}

function generateSlug(version: string, title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const v = version.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${v}-${base}`;
}

interface ChangelogFormProps {
  initialData?: ChangelogVersion;
}

export function ChangelogForm({ initialData }: ChangelogFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormData>(
    initialData ? formFromRelease(initialData) : emptyForm(),
  );
  const [saving, setSaving] = React.useState(false);

  const update = (patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleTitleChange = (title: string) => {
    const slug = generateSlug(form.version || "v0", title);
    update({ title, slug });
  };

  const handleVersionChange = (version: string) => {
    const slug = generateSlug(version, form.title || "untitled");
    update({ version, slug });
  };

  const addItem = (category: ChangelogCategory) => {
    const newItem: ItemForm = {
      id: `new-${Date.now()}`,
      category,
      title: "",
      description: "",
      mediaUrl: "",
    };
    update({ items: [...form.items, newItem] });
  };

  const updateItem = (id: string, patch: Partial<ItemForm>) => {
    update({
      items: form.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeItem = (id: string) => {
    update({ items: form.items.filter((item) => item.id !== id) });
  };

  const groupedItems = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = form.items.filter((item) => item.category === cat);
      return acc;
    },
    {} as Record<string, ItemForm[]>,
  );

  async function handleSubmit(publishAfterSave: boolean) {
    setSaving(true);
    try {
      const mod = await import("@/server/actions/changelog.actions");
      const finalStatus = publishAfterSave ? "published" : form.status;

      const payload = {
        version: form.version,
        slug: form.slug || generateSlug(form.version, form.title),
        title: form.title,
        releaseDate: form.releaseDate,
        status: finalStatus as ChangelogStatus,
        featured: form.featured,
        summary: form.summary || undefined,
        coverImage: form.coverImage || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        ogImage: form.ogImage || undefined,
        ctaText: form.ctaText || undefined,
        ctaLink: form.ctaLink || undefined,
        items: form.items
          .filter((item) => item.title.trim())
          .map((item, i) => ({
            category: item.category as ChangelogCategory,
            title: item.title,
            description: item.description || undefined,
            mediaUrl: item.mediaUrl || undefined,
            orderIndex: i + 1,
          })),
      };

      let result;
      if (initialData) {
        result = await mod.updateChangelogAction(initialData.id, payload);
      } else {
        result = await mod.createChangelogAction(payload as any);
      }

      if (result.success) {
        router.push("/platform/changelog");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const summaryChars = form.summary.length;

  return (
    <div className="space-y-8">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Basic Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Version</Label>
            <Input
              placeholder="v1.3.0"
              value={form.version}
              onChange={(e) => handleVersionChange(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Release Title</Label>
            <Input
              placeholder="AI Command Center"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Slug</Label>
            <Input
              placeholder="auto-generated"
              value={form.slug}
              onChange={(e) => update({ slug: e.target.value })}
              className="h-9 font-mono text-xs text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Release Date</Label>
            <Input
              type="date"
              value={form.releaseDate}
              onChange={(e) => update({ releaseDate: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update({ status: v as ChangelogStatus })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end space-x-2 pb-1">
            <Switch
              id="featured"
              checked={form.featured}
              onCheckedChange={(v) => update({ featured: v })}
            />
            <Label htmlFor="featured" className="text-xs cursor-pointer">
              Featured Release
            </Label>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Summary</h3>
        <div className="space-y-2">
          <Textarea
            placeholder="Rilis terbesar Seervisio yang menghadirkan AI Command Center dan peningkatan performa platform."
            value={form.summary}
            onChange={(e) => update({ summary: e.target.value })}
            className="min-h-[80px] text-sm"
            maxLength={300}
          />
          <p className={`text-right text-[10px] ${summaryChars > 280 ? "text-destructive" : "text-muted-foreground"}`}>
            {summaryChars}/300
          </p>
        </div>
      </Card>

      {/* Cover Image */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Cover Image</h3>
        <p className="mb-3 text-xs text-muted-foreground">Optional. Used in Landing Page hero.</p>
        {form.coverImage ? (
          <div className="relative overflow-hidden rounded-xl border">
            <img
              src={form.coverImage}
              alt="Cover"
              className="h-40 w-full object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => update({ coverImage: "" })}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://..."
              value={form.coverImage}
              onChange={(e) => update({ coverImage: e.target.value })}
              className="h-9 text-sm"
            />
            <Button variant="outline" size="sm" className="shrink-0 h-9">
              <Image className="mr-2 size-4" />
              Upload
            </Button>
          </div>
        )}
      </Card>

      {/* Release Notes */}
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold">Release Notes</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Buat item perubahan yang terorganisir dalam kategori.
        </p>

        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const items = groupedItems[cat] ?? [];
            return (
              <details key={cat} className="group rounded-xl border" open={items.length > 0}>
                <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium list-none [&::-webkit-details-marker]:hidden">
                  <span>{CATEGORY_EMOJI[cat]}</span>
                  <span>{CATEGORY_LABEL[cat]}</span>
                  {items.length > 0 && (
                    <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                  )}
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-2 border-t px-4 py-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg border p-3"
                    >
                      <GripVertical className="mt-2 size-4 shrink-0 text-muted-foreground/40" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          placeholder="Judul item"
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="h-8 text-sm"
                        />
                        <Textarea
                          placeholder="Deskripsi (opsional)"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="min-h-[60px] text-xs"
                        />
                        <Input
                          placeholder="URL media (opsional)"
                          value={item.mediaUrl}
                          onChange={(e) => updateItem(item.id, { mediaUrl: e.target.value })}
                          className="h-7 text-xs text-muted-foreground"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-1 size-7 shrink-0 text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => addItem(cat)}
                  >
                    <Plus className="mr-2 size-3.5" />
                    Tambah Item
                  </Button>
                </div>
              </details>
            );
          })}
        </div>
      </Card>

      {/* Featured Release */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Featured Release</h3>
            <p className="text-xs text-muted-foreground">Optional large feature card for the landing page.</p>
          </div>
          <Switch
            checked={form.featured}
            onCheckedChange={(v) => update({ featured: v })}
          />
        </div>
        {form.featured && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">CTA Text</Label>
              <Input
                placeholder="Pelajari Lebih Lanjut"
                value={form.ctaText}
                onChange={(e) => update({ ctaText: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">CTA Link</Label>
              <Input
                placeholder="/changelog/v1.3.0"
                value={form.ctaLink}
                onChange={(e) => update({ ctaLink: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          </div>
        )}
      </Card>

      {/* SEO */}
      <Card className="p-6">
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold list-none [&::-webkit-details-marker]:hidden">
            SEO
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Meta Title</Label>
              <Input
                placeholder="SEO title"
                value={form.metaTitle}
                onChange={(e) => update({ metaTitle: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">OG Image URL</Label>
              <Input
                placeholder="https://..."
                value={form.ogImage}
                onChange={(e) => update({ ogImage: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs">Meta Description</Label>
              <Textarea
                placeholder="SEO description"
                value={form.metaDescription}
                onChange={(e) => update({ metaDescription: e.target.value })}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
        </details>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Batal
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!form.slug}
            onClick={() => window.open(`/changelog/${form.slug}`, "_blank")}
          >
            <Eye className="mr-2 size-4" />
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Simpan Draft
          </Button>
          {form.status !== "published" && (
            <Button size="sm" onClick={() => handleSubmit(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Eye className="mr-2 size-4" />
              )}
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
