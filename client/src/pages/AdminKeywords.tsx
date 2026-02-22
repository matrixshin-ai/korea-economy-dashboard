import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Key, Settings, X, LogOut } from "lucide-react";

interface KeywordItem {
  id?: number;
  keyword: string;
  weight: number;
  isNegative: boolean;
  keywordGroup?: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
  quota: number;
  priority: number;
  andLogic: boolean;
  keywords: KeywordItem[];
}

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

function setToken(token: string) {
  localStorage.setItem("admin_token", token);
}

function clearToken() {
  localStorage.removeItem("admin_token");
}

async function adminFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  return fetch(url, { ...options, headers });
}

// --- Login Form ---
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Login failed");
        return;
      }

      const { token } = await res.json();
      setToken(token);
      onLogin();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Key className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Keyword Badge ---
function KeywordBadge({
  kw,
  onRemove,
  onWeightChange,
  onToggleNegative,
}: {
  kw: KeywordItem;
  onRemove: () => void;
  onWeightChange: (w: number) => void;
  onToggleNegative: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 mr-1 mb-1">
      <Badge
        variant={kw.isNegative ? "destructive" : "secondary"}
        className={`cursor-pointer ${kw.weight >= 4 ? "font-bold" : ""}`}
        onClick={onToggleNegative}
        title={kw.isNegative ? "Negative keyword (click to toggle)" : "Click to toggle negative"}
      >
        {kw.keyword}
      </Badge>
      <Select
        value={String(kw.weight)}
        onValueChange={(v) => onWeightChange(Number(v))}
      >
        <SelectTrigger className="h-6 w-14 text-xs px-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5].map((w) => (
            <SelectItem key={w} value={String(w)}>
              w:{w}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive p-0.5"
        title="Remove keyword"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// --- Category Card ---
function CategoryCard({
  category,
  onChange,
  onDelete,
}: {
  category: CategoryItem;
  onChange: (cat: CategoryItem) => void;
  onDelete: () => void;
}) {
  const [newKeyword, setNewKeyword] = useState("");
  const [newIsNegative, setNewIsNegative] = useState(false);
  const [newGroup, setNewGroup] = useState<string>("A");

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    onChange({
      ...category,
      keywords: [
        ...category.keywords,
        {
          keyword: kw,
          weight: 1,
          isNegative: newIsNegative,
          keywordGroup: category.andLogic ? newGroup : null,
        },
      ],
    });
    setNewKeyword("");
    setNewIsNegative(false);
  };

  const removeKeyword = (idx: number) => {
    onChange({
      ...category,
      keywords: category.keywords.filter((_, i) => i !== idx),
    });
  };

  const updateKeywordWeight = (idx: number, weight: number) => {
    const kws = [...category.keywords];
    kws[idx] = { ...kws[idx], weight };
    onChange({ ...category, keywords: kws });
  };

  const toggleKeywordNegative = (idx: number) => {
    const kws = [...category.keywords];
    kws[idx] = { ...kws[idx], isNegative: !kws[idx].isNegative };
    onChange({ ...category, keywords: kws });
  };

  const positiveKeywords = category.keywords
    .map((kw, idx) => ({ ...kw, _idx: idx }))
    .filter((kw) => !kw.isNegative);
  const negativeKeywords = category.keywords
    .map((kw, idx) => ({ ...kw, _idx: idx }))
    .filter((kw) => kw.isNegative);

  const groupA = positiveKeywords.filter((kw) => kw.keywordGroup === "A");
  const groupB = positiveKeywords.filter((kw) => kw.keywordGroup === "B");

  const renderKeywordList = (items: typeof positiveKeywords) => (
    <div className="flex flex-wrap">
      {items.map((kw) => (
        <KeywordBadge
          key={kw._idx}
          kw={kw}
          onRemove={() => removeKeyword(kw._idx)}
          onWeightChange={(w) => updateKeywordWeight(kw._idx, w)}
          onToggleNegative={() => toggleKeywordNegative(kw._idx)}
        />
      ))}
      {items.length === 0 && (
        <span className="text-xs text-muted-foreground">No keywords</span>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{category.name}</CardTitle>
            {category.andLogic && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                AND
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Quota:</label>
            <Input
              type="number"
              min={1}
              max={50}
              className="h-7 w-16 text-xs"
              value={category.quota}
              onChange={(e) =>
                onChange({ ...category, quota: Number(e.target.value) || 5 })
              }
            />
            <label className="text-xs text-muted-foreground">Priority:</label>
            <Input
              type="number"
              min={0}
              max={100}
              className="h-7 w-16 text-xs"
              value={category.priority}
              onChange={(e) =>
                onChange({ ...category, priority: Number(e.target.value) || 0 })
              }
            />
            <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap" title="AND logic: both keyword groups must match">
              <input
                type="checkbox"
                checked={category.andLogic}
                onChange={(e) =>
                  onChange({ ...category, andLogic: e.target.checked })
                }
                className="h-3 w-3"
              />
              AND
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {category.andLogic ? (
          <>
            {/* Group A */}
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Group A ({groupA.length})
              </p>
              {renderKeywordList(groupA)}
            </div>
            {/* AND indicator */}
            <div className="text-center text-xs text-muted-foreground font-bold py-0.5">
              AND
            </div>
            {/* Group B */}
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Group B ({groupB.length})
              </p>
              {renderKeywordList(groupB)}
            </div>
          </>
        ) : (
          /* Normal: single keyword list */
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Keywords ({positiveKeywords.length})
            </p>
            {renderKeywordList(positiveKeywords)}
          </div>
        )}

        {/* Negative keywords */}
        {negativeKeywords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Negative ({negativeKeywords.length})
            </p>
            <div className="flex flex-wrap">
              {negativeKeywords.map((kw) => (
                <KeywordBadge
                  key={kw._idx}
                  kw={kw}
                  onRemove={() => removeKeyword(kw._idx)}
                  onWeightChange={(w) => updateKeywordWeight(kw._idx, w)}
                  onToggleNegative={() => toggleKeywordNegative(kw._idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add keyword input */}
        <div className="flex gap-1 items-center">
          <Input
            placeholder="New keyword"
            className="h-7 text-xs flex-1"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addKeyword();
              }
            }}
          />
          {category.andLogic && (
            <Select value={newGroup} onValueChange={setNewGroup}>
              <SelectTrigger className="h-7 w-16 text-xs px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
              </SelectContent>
            </Select>
          )}
          <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
            <input
              type="checkbox"
              checked={newIsNegative}
              onChange={(e) => setNewIsNegative(e.target.checked)}
              className="h-3 w-3"
            />
            neg
          </label>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={addKeyword}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function AdminKeywordsPage() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCatDialogOpen, setNewCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatAndLogic, setNewCatAndLogic] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin");
      if (res.status === 401) {
        clearToken();
        setAuthenticated(false);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCategories(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin", {
        method: "PUT",
        body: JSON.stringify({ action: "update-keywords", categories }),
      });
      if (res.status === 401) {
        clearToken();
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Save failed");
      }
      toast({ title: "Saved", description: "Keywords updated successfully" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async (andLogic = false) => {
    const name = newCatName.trim();
    if (!name) return;

    try {
      const res = await adminFetch("/api/admin", {
        method: "POST",
        body: JSON.stringify({ action: "add-category", name, quota: 5, priority: 0, andLogic }),
      });
      if (res.status === 401) {
        clearToken();
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create category");
      }
      setNewCatName("");
      setNewCatDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    if (!confirm("Are you sure you want to delete this category and all its keywords?")) return;

    try {
      const res = await adminFetch("/api/admin", {
        method: "DELETE",
        body: JSON.stringify({ action: "delete-category", id: catId }),
      });
      if (res.status === 401) {
        clearToken();
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to delete");
      }
      fetchData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateCategory = (idx: number, cat: CategoryItem) => {
    const updated = [...categories];
    updated[idx] = cat;
    setCategories(updated);
  };

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LoginForm onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">Keyword Rules</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewCatDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Category
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories grid */}
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No categories yet. Add one to get started.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((cat, idx) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                onChange={(updated) => updateCategory(idx, updated)}
                onDelete={() => handleDeleteCategory(cat.id)}
              />
            ))}
          </div>
        )}

        {/* New Category Dialog */}
        <Dialog open={newCatDialogOpen} onOpenChange={setNewCatDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory(newCatAndLogic);
                  }
                }}
                autoFocus
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={newCatAndLogic}
                  onChange={(e) => setNewCatAndLogic(e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                AND logic (two keyword groups must both match)
              </label>
              <Button className="w-full" onClick={() => handleAddCategory(newCatAndLogic)}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
