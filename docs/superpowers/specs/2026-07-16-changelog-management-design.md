# Changelog Management — Platform Console

## Objective

Create a **Changelog Management** module inside the Platform Console so Seervisio administrators can manage all product updates from one place. The landing page, dashboard "What's New", and future in-app notifications consume this single source of truth.

## Architecture

### Route Structure

```
/platform/changelog              → List page (table + summary cards)
/platform/changelog/new          → Create release form
/platform/changelog/[id]/edit    → Edit release form
```

### Layer Map

| Layer | File | Purpose |
|---|---|---|
| Migration | `supabase/migrations/126_changelog_management.sql` | Add columns, new tables |
| Types | `src/types/changelog.ts` | Expand existing interfaces |
| Repository | `src/server/repositories/changelog.repository.ts` | Full CRUD |
| Actions | `src/server/actions/changelog.actions.ts` | Server actions for platform |
| List page | `src/app/platform/changelog/page.tsx` | Server component |
| List client | `src/app/platform/changelog/changelog-content.tsx` | Table + filters + summary cards |
| Create page | `src/app/platform/changelog/new/page.tsx` | Server component |
| Create form | `src/app/platform/changelog/_components/changelog-form.tsx` | Shared form component |
| Edit page | `src/app/platform/changelog/[id]/edit/page.tsx` | Server component |
| Edit form | `src/app/platform/changelog/[id]/edit/edit-changelog-client.tsx` | Wraps form with initial data |
| Sidebar | `src/components/layout/platform-sidebar.tsx` | Add "Content" section |
| Layout title | `src/app/platform/platform-layout-client.tsx` | Add changelog title mapping |

### Database Changes

**`changelog_versions`** — alter existing table:
- Add `slug text not null` (unique, auto-generated from title)
- Add `cover_image text` (optional Supabase storage URL)
- Add `status text not null default 'draft'` (draft/published/scheduled/archived)
- Add `published_at timestamptz`
- Add `created_by uuid references public.profiles(id)`
- Add `meta_title text`
- Add `meta_description text`
- Add `og_image text`
- Add `cta_text text` (featured release CTA)
- Add `cta_link text` (featured release CTA URL)
- Change `published boolean` → removed (replaced by status)
- Change `featured boolean` → kept as-is

**`changelog_items`** — alter existing table:
- Add `media_url text` (optional screenshot/video URL)
- Add `media_type text` (image/video, nullable)

**New `changelog_read_logs`** — create:
- `id uuid primary key default gen_random_uuid()`
- `profile_id uuid references public.profiles(id)` (nullable — anonymous reads)
- `release_id uuid references public.changelog_versions(id)`
- `read_at timestamptz default now()`

### Repository Functions

```typescript
// src/server/repositories/changelog.repository.ts (expanded)
createRelease(input)       → ChangelogVersion
updateRelease(id, input)   → ChangelogVersion
publishRelease(id)         → ChangelogVersion
archiveRelease(id)         → ChangelogVersion
deleteDraft(id)            → void
getRelease(id)             → ChangelogVersion | null
getReleaseBySlug(slug)     → ChangelogVersion | null
getReleases(filters)       → ChangelogVersion[]
getPublishedReleases()     → ChangelogVersion[]
getLatestRelease()         → ChangelogVersion | null
createReleaseItem(input)   → ChangelogItem
updateReleaseItem(id, input)→ ChangelogItem
deleteReleaseItem(id)      → void
logRead(profileId, releaseId)→ void
getLastSeenVersion(profileId)→ string | null
updateLastSeenVersion(profileId, version)→ void
```

### Server Actions

```typescript
// src/server/actions/changelog.actions.ts (expanded)
getChangelogsAction(filters)    → ActionResult<ChangelogVersion[]>
createChangelogAction(input)    → ActionResult<ChangelogVersion>
updateChangelogAction(id, input)→ ActionResult<ChangelogVersion>
publishChangelogAction(id)      → ActionResult<ChangelogVersion>
archiveChangelogAction(id)      → ActionResult<ChangelogVersion>
deleteChangelogDraftAction(id)  → ActionResult<void>
getChangelogAction(id)          → ActionResult<ChangelogVersion | null>
```

### UI Components

**List page** (`changelog-content.tsx`):
- Summary cards: Total Release, Published, Draft, Latest Version
- Search input (version + title)
- Status filter tabs (All / Published / Draft / Scheduled / Archived)
- Sort dropdown (Newest / Oldest / Version / Release Date)
- Table: Version, Title, Release Date, Status, Highlights count, Created By, Updated At, Actions
- Actions dropdown: Edit, Publish/Archive, Delete (draft only)
- Empty state

**Create/Edit form** (`changelog-form.tsx`):
- Version (text input, `v1.3.0` format)
- Release Title
- Slug (auto-generated from title, editable)
- Release Date (date picker)
- Status select (Draft / Published / Scheduled)
- Featured Release toggle
- Summary textarea (300 char max + counter)
- Cover image upload (drag & drop)
- Categorized release notes:
  - Category tabs (Fitur Baru, Improvement, Bug Fix, etc.)
  - Each category has an add button + list of items
  - Each item: Title, Description, Media URL, drag-to-reorder
- Featured Release section (optional):
  - Title, Subtitle, Description, Image, CTA Text, CTA Link
- SEO section (collapsible):
  - Meta Title, Meta Description, OG Image
- Preview button → opens `/changelog/<slug>` in new tab
- Save / Save & Publish buttons

### Sidebar

Add a "Content" section group above "Management":

```typescript
<SidebarGroup>
  <SidebarGroupLabel>Content</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      {CONTENT_ITEMS.map(...)}
    </SidebarMenu>
  </SidebarGroupContent>
</SidebarGroup>
```

With one item initially: `Changelog` (`Newspaper` icon, href: `/platform/changelog`).

### Landing Page Integration

The existing `src/app/(landing)/changelog/` already queries `getChangelogVersionsAction()` which reads published releases from the DB. Update the types to match the new schema. No structural changes needed.

### Dashboard Notification

Add a client component that:
1. On mount, fetches `getLatestRelease()` 
2. Reads `last_seen_version` from user preferences
3. If latest release version > last_seen_version, shows a banner
4. On click, marks as read and updates `last_seen_version`

## Acceptance Criteria

- [x] Dedicated Changelog Management page at `/platform/changelog`
- [x] Create / Edit / Delete Draft
- [x] Publish & Archive workflow
- [x] Categorized Release Notes with reordering
- [x] Featured Release support
- [x] Search by version & title
- [x] Filter by status (All / Published / Draft / Scheduled / Archived)
- [x] Sort (Newest / Oldest / Version / Release Date)
- [x] Cover image upload
- [x] Existing landing page reads from DB
- [x] Repository Pattern
- [x] Server Actions
- [x] Responsive design
- [x] Dark mode (follows existing theme)
