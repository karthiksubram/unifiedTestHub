import { type CSSProperties, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowRight, Bell, BookOpen, Check, CheckCircle2,
  ChevronLeft, ChevronRight, CircleHelp, Code2, Copy, Filter, Grid2X2,
  Layers3, LayoutDashboard, Menu, MoreHorizontal, Package, PanelLeft, Search,
  Settings2, SlidersHorizontal, Sparkles, Table2, Terminal, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

type Category = 'All patterns' | 'Foundations' | 'Forms' | 'Navigation' | 'Feedback' | 'Overlays' | 'Data display';
type ComponentKind = 'button' | 'form' | 'tabs' | 'navigation' | 'feedback' | 'overlay' | 'accordion' | 'progress' | 'table' | 'empty';

type ComponentItem = {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, 'All patterns'>;
  kind: ComponentKind;
  status: 'Ready' | 'New';
  tags: string[];
  code: string;
};

const fontOptions = [
  { value: 'inter', label: 'Inter', family: "'Inter', sans-serif" },
  { value: 'plus-jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif" },
  { value: 'geist', label: 'Geist', family: "'Geist', sans-serif" },
  { value: 'manrope', label: 'Manrope', family: "'Manrope', sans-serif" },
  { value: 'dm-sans', label: 'DM Sans', family: "'DM Sans', sans-serif" },
  { value: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
] as const;

const components: ComponentItem[] = [
  { id: 'action-buttons', name: 'Action buttons', description: 'A flexible button family for primary, secondary, and quiet actions.', category: 'Foundations', kind: 'button', status: 'Ready', tags: ['buttons', 'actions'], code: `<Button variant="default">Save changes</Button>\n<Button variant="outline">Cancel</Button>` },
  { id: 'text-input', name: 'Text input', description: 'Single-line input with helper, error, and success states.', category: 'Forms', kind: 'form', status: 'Ready', tags: ['input', 'validation'], code: `<Label htmlFor="workspace">Workspace name</Label>\n<Input id="workspace" placeholder="Design systems" />` },
  { id: 'segmented-tabs', name: 'Segmented tabs', description: 'Compact tabs for switching views without losing context.', category: 'Navigation', kind: 'tabs', status: 'Ready', tags: ['tabs', 'views'], code: `<Tabs defaultValue="overview">\n  <TabsList>...</TabsList>\n</Tabs>` },
  { id: 'sidebar-nav', name: 'Sidebar navigation', description: 'A focused navigation rail with active, nested, and utility items.', category: 'Navigation', kind: 'navigation', status: 'Ready', tags: ['sidebar', 'menu'], code: `<nav aria-label="Primary">\n  <NavItem active>Overview</NavItem>\n</nav>` },
  { id: 'status-alert', name: 'Status alert', description: 'Clear inline messaging for updates, warnings, and system health.', category: 'Feedback', kind: 'feedback', status: 'New', tags: ['alert', 'status'], code: `<Alert>\n  <AlertTitle>Sync complete</AlertTitle>\n  <AlertDescription>Your library is up to date.</AlertDescription>\n</Alert>` },
  { id: 'confirmation-dialog', name: 'Confirmation dialog', description: 'A focused decision point for destructive or consequential actions.', category: 'Overlays', kind: 'overlay', status: 'Ready', tags: ['dialog', 'modal'], code: `<Dialog>\n  <DialogTrigger asChild><Button>Archive</Button></DialogTrigger>\n  <DialogContent>...</DialogContent>\n</Dialog>` },
  { id: 'disclosure', name: 'Disclosure list', description: 'Progressive disclosure for dense documentation and settings.', category: 'Navigation', kind: 'accordion', status: 'Ready', tags: ['accordion', 'content'], code: `<Accordion type="single" collapsible>\n  <AccordionItem value="item-1">...</AccordionItem>\n</Accordion>` },
  { id: 'progress-meter', name: 'Progress meter', description: 'A calm progress indicator for uploads, setup, or completion.', category: 'Feedback', kind: 'progress', status: 'Ready', tags: ['progress', 'loading'], code: `<Progress value={72} aria-label="72% complete" />` },
  { id: 'data-table', name: 'Data table', description: 'Structured rows with selection, status, metadata, and pagination.', category: 'Data display', kind: 'table', status: 'Ready', tags: ['table', 'selection'], code: `<Table>\n  <TableHeader>...</TableHeader>\n  <TableBody>...</TableBody>\n</Table>` },
  { id: 'empty-state', name: 'Empty state', description: 'A useful next step when a view has no content yet.', category: 'Data display', kind: 'empty', status: 'New', tags: ['empty', 'onboarding'], code: `<EmptyState\n  title="No projects yet"\n  action={<Button>Create project</Button>}\n/>` },
];

const categoryMeta: { label: Category; icon: typeof Grid2X2; count?: number }[] = [
  { label: 'All patterns', icon: Grid2X2, count: components.length },
  { label: 'Foundations', icon: Layers3, count: 1 },
  { label: 'Forms', icon: SlidersHorizontal, count: 1 },
  { label: 'Navigation', icon: PanelLeft, count: 3 },
  { label: 'Feedback', icon: Activity, count: 2 },
  { label: 'Overlays', icon: Sparkles, count: 1 },
  { label: 'Data display', icon: Table2, count: 2 },
];

function MiniLabel({ children }: { children: string }) {
  return <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</div>;
}

function ComponentPreview({ item }: { item: ComponentItem }) {
  const [tab, setTab] = useState('overview');
  const [enabled, setEnabled] = useState(true);
  const [checked, setChecked] = useState(false);
  const [progress, setProgress] = useState(72);
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [toast, setToast] = useState(false);
  const rows = ['Changelog', 'Foundations', 'Release notes'];

  if (item.kind === 'button') return <div className="flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => setToast(true)}>Save changes</Button><Button size="sm" variant="outline">Preview</Button><Button size="sm" variant="ghost">Quiet action</Button>{toast && <span className="flex items-center gap-1 text-xs font-medium text-primary"><CheckCircle2 className="size-3.5" /> Saved</span>}</div>;
  if (item.kind === 'form') return <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div className="space-y-1.5"><label htmlFor={`input-${item.id}`} className="text-xs font-semibold text-foreground">Workspace name</label><Input id={`input-${item.id}`} defaultValue="Untitled workspace" className="h-9 bg-background/80" /><p className="text-[11px] text-muted-foreground">Use a name your team will recognize.</p></div><Button size="sm" variant="secondary" onClick={() => setToast(true)}>Update</Button></div>;
  if (item.kind === 'tabs') return <Tabs value={tab} onValueChange={setTab} className="w-full"><TabsList className="h-8 bg-muted/80"><TabsTrigger value="overview" className="h-6 px-3 text-xs">Overview</TabsTrigger><TabsTrigger value="usage" className="h-6 px-3 text-xs">Usage</TabsTrigger><TabsTrigger value="tokens" className="h-6 px-3 text-xs">Tokens</TabsTrigger></TabsList><TabsContent value="overview" className="mt-3 text-xs text-muted-foreground">A tab set keeps related views close without adding navigation noise.</TabsContent><TabsContent value="usage" className="mt-3 font-code text-xs text-primary">tab = &quot;usage&quot;</TabsContent><TabsContent value="tokens" className="mt-3 text-xs text-muted-foreground">Spacing and color tokens stay consistent.</TabsContent></Tabs>;
  if (item.kind === 'navigation') return <div className="flex items-center gap-1 rounded-lg border bg-background/70 p-1"><Button size="sm" variant="secondary" className="h-8 gap-2 text-xs"><LayoutDashboard className="size-3.5" />Overview</Button><Button size="sm" variant="ghost" className="h-8 gap-2 text-xs"><Package className="size-3.5" />Components</Button><Button size="sm" variant="ghost" className="h-8 gap-2 text-xs"><Settings2 className="size-3.5" />Settings</Button></div>;
  if (item.kind === 'feedback') return <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"><div className="rounded-full bg-primary/10 p-1.5 text-primary"><CheckCircle2 className="size-4" /></div><div className="min-w-0 flex-1"><div className="text-sm font-semibold">Sync complete</div><p className="mt-0.5 text-xs text-muted-foreground">Your component library is ready to browse.</p></div><Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Toggle sync status" /></div>;
  if (item.kind === 'overlay') return <Dialog><DialogTrigger asChild><Button size="sm" variant="outline" className="gap-2"><AlertCircle className="size-3.5" />Open confirmation</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Archive this component?</DialogTitle><DialogDescription>This will hide the component from the default gallery. You can restore it later.</DialogDescription></DialogHeader><div className="flex justify-end gap-2 pt-2"><Button variant="outline">Cancel</Button><Button onClick={() => setToast(true)}>Archive component</Button></div></DialogContent></Dialog>;
  if (item.kind === 'accordion') return <Accordion type="single" collapsible className="w-full"><AccordionItem value="foundations" className="border-none"><AccordionTrigger className="py-2 text-xs hover:no-underline">What belongs in foundations?</AccordionTrigger><AccordionContent className="pb-1 text-xs text-muted-foreground">Small primitives that shape every other pattern: color, type, buttons, and icons.</AccordionContent></AccordionItem><AccordionItem value="composing" className="border-none"><AccordionTrigger className="py-2 text-xs hover:no-underline">How should patterns be composed?</AccordionTrigger><AccordionContent className="pb-1 text-xs text-muted-foreground">Start with hierarchy, then add interaction only when it clarifies the next step.</AccordionContent></AccordionItem></Accordion>;
  if (item.kind === 'progress') return <div className="space-y-3"><div className="flex items-center justify-between text-xs"><span className="font-medium">Library migration</span><span className="font-code text-primary">{progress}%</span></div><Progress value={progress} aria-label={`${progress}% complete`} /><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 8))}>Back</Button><Button size="sm" onClick={() => setProgress(Math.min(100, progress + 8))}>Advance</Button></div></div>;
  if (item.kind === 'table') return <div className="overflow-hidden rounded-lg border bg-background/60"><Table><TableHeader><TableRow><TableHead className="w-8"></TableHead><TableHead>Pattern</TableHead><TableHead>Updated</TableHead><TableHead className="text-right">Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row}><TableCell><Checkbox checked={selectedRows.includes(row)} onCheckedChange={(value) => setSelectedRows(value ? [...selectedRows, row] : selectedRows.filter((selected) => selected !== row))} aria-label={`Select ${row}`} /></TableCell><TableCell className="text-xs font-medium">{row}</TableCell><TableCell className="text-xs text-muted-foreground">Today</TableCell><TableCell className="text-right"><Badge variant="outline" className="text-[10px]">Ready</Badge></TableCell></TableRow>)}</TableBody></Table><div className="flex items-center justify-between border-t px-3 py-2"><span className="text-[11px] text-muted-foreground">{selectedRows.length ? `${selectedRows.length} selected` : '3 patterns'}</span><div className="flex items-center gap-1"><Button size="icon" variant="ghost" className="size-7" onClick={() => setPage(1)} disabled={page === 1} aria-label="Previous page"><ChevronLeft className="size-3.5" /></Button><span className="font-code text-[11px]">0{page} / 02</span><Button size="icon" variant="ghost" className="size-7" onClick={() => setPage(2)} disabled={page === 2} aria-label="Next page"><ChevronRight className="size-3.5" /></Button></div></div></div>;
  return <div className="flex items-center justify-between rounded-lg border border-dashed bg-background/50 p-4"><div><div className="text-sm font-semibold">Nothing here yet</div><p className="mt-1 text-xs text-muted-foreground">Start with a small, useful first step.</p></div><Button size="sm" onClick={() => setChecked(!checked)}>{checked ? 'Project created' : 'Create project'}<ArrowRight className="size-3.5" /></Button></div>;
}

function ComponentCard({ item, selected, onSelect }: { item: ComponentItem; selected: boolean; onSelect: () => void }) {
  return <Card className={`group overflow-hidden border bg-card/80 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-primary/60 ring-2 ring-primary/10' : ''}`} data-testid={`card-component-${item.id}`}>
    <div className="paper-grid relative min-h-[178px] overflow-hidden border-b bg-muted/20 p-5">
      <div className="absolute right-4 top-4 flex items-center gap-1.5"><Badge variant={item.status === 'New' ? 'default' : 'outline'} className="text-[10px]">{item.status}</Badge><span className="font-code text-[10px] text-muted-foreground">0{components.indexOf(item) + 1}</span></div>
      <div className="flex min-h-[138px] items-center justify-center pt-5"><div className="w-full max-w-[390px]"><ComponentPreview item={item} /></div></div>
    </div>
    <button type="button" onClick={onSelect} className="flex w-full items-start justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" data-testid={`button-inspect-${item.id}`}>
      <div><div className="font-display text-sm font-semibold tracking-tight">{item.name}</div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p></div><ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </button>
    <div className="flex items-center gap-2 border-t px-4 py-2.5"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.category}</span><div className="ml-auto flex gap-1">{item.tags.slice(0, 2).map((tag) => <span key={tag} className="font-code text-[10px] text-muted-foreground">#{tag}</span>)}</div></div>
  </Card>;
}

function Inspector({ item, onClose }: { item: ComponentItem; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(item.code); } catch { /* local demo fallback */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return <aside className="animate-in slide-in-from-right-3 fade-in-0 duration-300 border-l bg-card/90 p-5 lg:sticky lg:top-0 lg:h-[calc(100dvh-72px)] lg:overflow-y-auto" data-testid="panel-component-inspector">
    <div className="mb-7 flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="font-code text-[10px]">INSPECTING</Badge><span className="font-code text-[10px] text-muted-foreground">/ {item.category.toLowerCase()}</span></div><h2 className="font-display text-2xl font-bold tracking-tight">{item.name}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close inspector" data-testid="button-close-inspector"><X className="size-4" /></Button></div>
    <div className="space-y-6">
      <div><MiniLabel>Live preview</MiniLabel><Card className="overflow-hidden border bg-background shadow-none"><div className="paper-grid p-5"><ComponentPreview item={item} /></div></Card></div>
      <div><div className="mb-2 flex items-center justify-between"><MiniLabel>Usage</MiniLabel><Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={copyCode} data-testid="button-copy-code">{copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}{copied ? 'Copied' : 'Copy code'}</Button></div><pre className="overflow-x-auto rounded-lg border bg-[hsl(224_27%_20%)] p-4 font-code text-[11px] leading-6 text-[hsl(42_28%_94%)]"><code>{item.code}</code></pre></div>
      <div><MiniLabel>Built with</MiniLabel><div className="grid grid-cols-2 gap-2">{['Responsive', 'Keyboard ready', 'Tokenized', 'Composable'].map((feature) => <div key={feature} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs"><Check className="size-3.5 text-primary" />{feature}</div>)}</div></div>
      <div className="rounded-lg border border-accent/25 bg-accent/5 p-4"><div className="flex gap-3"><CircleHelp className="size-4 shrink-0 text-accent" /><div><div className="text-xs font-semibold">A note on composition</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">This preview is intentionally small. In a product, give the pattern room to establish hierarchy and state.</p></div></div></div>
    </div>
  </aside>;
}

function Sidebar({ category, setCategory, onSearch }: { category: Category; setCategory: (category: Category) => void; onSearch: (value: string) => void }) {
  return <aside className="hidden min-h-dvh w-[248px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex"><div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-6"><div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">U</div><div><div className="font-display text-sm font-bold tracking-tight">Untitled UI</div><div className="font-code text-[9px] uppercase tracking-[0.16em] text-sidebar-foreground/55">reference workspace</div></div></div><div className="flex-1 px-3 py-6"><div className="mb-3 px-3 font-code text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Browse library</div><nav className="space-y-1">{categoryMeta.map(({ label, icon: Icon, count }) => <button type="button" key={label} onClick={() => { setCategory(label); onSearch(''); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${category === label ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`button-filter-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon className="size-4" /><span className="flex-1">{label}</span>{count && <span className="font-code text-[10px] text-sidebar-foreground/40">{count}</span>}</button>)}</nav><Separator className="my-6 bg-sidebar-border" /><div className="mb-3 px-3 font-code text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Workspace</div><div className="space-y-1"><button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/70" onClick={() => onSearch('')}><BookOpen className="size-4" />Guides</button><button type="button" className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/70"><Terminal className="size-4" />Changelog</button></div></div><div className="border-t border-sidebar-border p-4"><div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3"><div className="flex size-8 items-center justify-center rounded-full bg-sidebar-primary/20 font-display text-xs font-bold text-sidebar-primary">DS</div><div className="min-w-0"><div className="truncate text-xs font-semibold">Design systems</div><div className="truncate font-code text-[10px] text-sidebar-foreground/45">local workspace</div></div><MoreHorizontal className="ml-auto size-4 text-sidebar-foreground/45" /></div></div></aside>;
}

function App() {
  const [category, setCategory] = useState<Category>('All patterns');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('curated');
  const [selected, setSelected] = useState<ComponentItem | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [fontKey, setFontKey] = useState('inter');
  const selectedFont = fontOptions.find((option) => option.value === fontKey) ?? fontOptions[0];
  const filtered = useMemo(() => {
    const result = components.filter((item) => (category === 'All patterns' || item.category === category) && `${item.name} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
    return sort === 'alphabetical' ? [...result].sort((a, b) => a.name.localeCompare(b.name)) : result;
  }, [category, search, sort]);
  const featured = components[2];

  return <div className="noise flex min-h-dvh bg-background" style={{ fontFamily: selectedFont.family, '--app-font-sans': selectedFont.family, '--app-font-display': selectedFont.family } as CSSProperties}>
    <Sidebar category={category} setCategory={setCategory} onSearch={setSearch} />
    {mobileNav && <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)}><div className="h-full w-[280px] bg-sidebar" onClick={(event) => event.stopPropagation()}><div className="flex h-[72px] items-center gap-3 border-b border-sidebar-border px-6 text-sidebar-foreground"><div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground">U</div><span className="font-display font-bold">Untitled UI</span></div><div className="p-3">{categoryMeta.map(({ label, icon: Icon, count }) => <button type="button" key={label} onClick={() => { setCategory(label); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm ${category === label ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70'}`}><Icon className="size-4" /><span className="flex-1">{label}</span><span className="font-code text-[10px]">{count}</span></button>)}</div></div></div>}
    <main className="min-w-0 flex-1">
       <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-md sm:px-7"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation" data-testid="button-open-navigation"><Menu className="size-5" /></Button><div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="font-code text-[10px]">LIBRARY</span><ChevronRight className="size-3.5" /><span className="font-medium text-foreground">{category}</span></div><div className="ml-auto flex items-center gap-2"><div className="hidden items-center gap-2 md:flex"><span className="font-code text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Type</span><Select value={fontKey} onValueChange={setFontKey}><SelectTrigger className="h-8 w-[154px] bg-card text-xs" aria-label="Preview font" data-testid="select-preview-font"><SelectValue /></SelectTrigger><SelectContent>{fontOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div><Button variant="ghost" size="icon" className="hidden sm:inline-flex" aria-label="Open documentation" data-testid="button-open-docs"><BookOpen className="size-4" /></Button><Button variant="ghost" size="icon" aria-label="Open notifications" data-testid="button-open-notifications"><Bell className="size-4" /></Button><div className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary/10 font-display text-xs font-bold text-primary">AR</div></div></header>
      <div className={`${selected ? 'lg:pr-0' : ''} mx-auto max-w-[1460px]`}>
        <div className={`grid ${selected ? 'lg:grid-cols-[minmax(0,1fr)_365px]' : ''}`}>
          <div className="min-w-0 px-4 py-7 sm:px-7 sm:py-9">
            <section className="relative overflow-hidden rounded-2xl border bg-sidebar p-6 text-sidebar-foreground shadow-lg sm:p-9"><div className="absolute -right-16 -top-20 size-64 rounded-full border-[28px] border-sidebar-primary/10" /><div className="absolute -bottom-24 right-28 size-56 rounded-full border border-accent/20" /><div className="relative max-w-2xl"><div className="mb-4 flex flex-wrap items-center gap-2"><Badge className="border-sidebar-primary/25 bg-sidebar-primary/15 text-sidebar-primary hover:bg-sidebar-primary/15">THE COMPONENT INDEX</Badge><span className="font-code text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">v2.4 / local</span></div><h1 className="font-display text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">A sharper way to<br /><span className="text-sidebar-primary">build the interface.</span></h1><p className="mt-5 max-w-xl text-sm leading-relaxed text-sidebar-foreground/65 sm:text-base">A living reference workspace for browsing the decisions behind polished product UI. Inspect the pattern, try the state, then take the idea with you.</p><div className="mt-7 flex flex-wrap items-center gap-3"><Button className="gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" onClick={() => { setCategory('All patterns'); setSearch(''); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }} data-testid="button-browse-library">Browse the library <ArrowRight className="size-4" /></Button><span className="flex items-center gap-2 font-code text-[10px] text-sidebar-foreground/50"><Zap className="size-3.5 text-sidebar-primary" />10 live patterns · no setup</span></div></div></section>
            <section className="mt-8 grid gap-4 md:grid-cols-[1.25fr_.75fr]"><Card className="relative overflow-hidden border bg-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2"><Sparkles className="size-4 text-accent" /><span className="font-code text-[10px] uppercase tracking-[0.16em] text-accent">Featured pattern</span></div><h2 className="font-display text-xl font-bold tracking-tight">{featured.name}</h2><p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{featured.description}</p></div><Badge variant="outline" className="shrink-0 font-code text-[10px]">0{components.indexOf(featured) + 1}</Badge></div><div className="mt-5 rounded-lg border bg-muted/25 p-4"><ComponentPreview item={featured} /></div><button type="button" onClick={() => setSelected(featured)} className="mt-4 flex items-center gap-2 text-xs font-semibold text-primary hover:underline" data-testid="button-inspect-featured">Inspect this pattern <ArrowRight className="size-3.5" /></button></Card><Card className="border bg-[hsl(36_78%_67%)] p-5 text-[hsl(224_27%_20%)] sm:p-6"><div className="flex items-center justify-between"><div className="flex size-9 items-center justify-center rounded-full bg-[hsl(224_27%_20%_/_0.1)]"><Code2 className="size-4" /></div><span className="font-code text-[10px] uppercase tracking-[0.16em] opacity-60">Workspace pulse</span></div><div className="mt-9 font-display text-5xl font-bold tracking-[-0.06em]">10</div><p className="mt-1 font-medium">patterns ready to inspect</p><Separator className="my-5 bg-[hsl(224_27%_20%_/_0.15)]" /><div className="flex items-center justify-between text-xs"><span className="opacity-65">Coverage</span><span className="font-code">06 categories</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[hsl(224_27%_20%_/_0.15)]"><div className="h-full w-[86%] rounded-full bg-[hsl(224_27%_20%)]" /></div></Card></section>
            <section id="gallery" className="mt-11 scroll-mt-24"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 font-code text-[10px] uppercase tracking-[0.18em] text-muted-foreground">The collection</div><h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Browse the building blocks</h2><p className="mt-1.5 text-sm text-muted-foreground">Small decisions, made visible.</p></div><div className="flex items-center gap-2"><Select value={sort} onValueChange={setSort}><SelectTrigger className="h-9 w-[142px] bg-card text-xs" aria-label="Sort patterns" data-testid="select-sort"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="curated">Curated order</SelectItem><SelectItem value="alphabetical">Alphabetical</SelectItem></SelectContent></Select><Button variant="outline" size="icon" className="size-9" aria-label="Filter patterns" data-testid="button-more-filters"><Filter className="size-3.5" /></Button></div></div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patterns, states, or keywords..." className="h-10 bg-card pl-9" aria-label="Search components" data-testid="input-search-components" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search" data-testid="button-clear-search"><X className="size-3.5" /></button>}</div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="font-code">{filtered.length.toString().padStart(2, '0')}</span> patterns shown</div></div>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{categoryMeta.map(({ label }) => <button type="button" key={label} onClick={() => setCategory(label)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${category === label ? 'border-foreground bg-foreground text-background' : 'bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground'}`} data-testid={`chip-category-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</button>)}</div>
              {filtered.length ? <div className="mt-6 grid gap-4 xl:grid-cols-2">{filtered.map((item) => <ComponentCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => setSelected(item)} />)}</div> : <div className="mt-6 flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 text-center" data-testid="empty-search-results"><div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><Search className="size-5" /></div><h3 className="font-display text-lg font-semibold">No patterns match that search</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">Try a broader term like “input”, “navigation”, or “status”.</p><Button variant="outline" size="sm" className="mt-5" onClick={() => { setSearch(''); setCategory('All patterns'); }} data-testid="button-reset-search">Reset filters</Button></div>}
            </section>
            <footer className="mt-14 flex flex-col gap-3 border-t py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><div className="flex size-5 items-center justify-center rounded bg-sidebar font-display text-[10px] font-bold text-sidebar-primary">U</div><span>Untitled UI reference workspace</span></div><div className="flex items-center gap-4"><span className="font-code">DESIGNED FOR DISCOVERY</span><span>© 2024</span></div></footer>
          </div>
          {selected && <Inspector item={selected} onClose={() => setSelected(null)} />}
        </div>
      </div>
    </main>
  </div>;
}

export default App;
