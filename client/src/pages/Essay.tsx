import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, Plus, Loader2, Pencil, Trash2, LogIn } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import type { Essay, InsertEssay } from "@shared/schema";

export default function EssayPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEssay, setEditingEssay] = useState<Essay | null>(null);
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const { data: essays, isLoading } = useQuery<Essay[]>({
    queryKey: ["/api/essays"],
  });

  const createEssayMutation = useMutation({
    mutationFn: async (data: InsertEssay) => {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to create essay");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      setIsDialogOpen(false);
    },
  });

  const updateEssayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertEssay> }) => {
      const response = await fetch(`/api/essays/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to update essay");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      setEditingEssay(null);
      setIsDialogOpen(false);
    },
  });

  const deleteEssayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/essays/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to delete essay");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: InsertEssay = {
      title: formData.get("title") as string,
      titleEn: formData.get("titleEn") as string || null,
      content: formData.get("content") as string,
      contentEn: formData.get("contentEn") as string || null,
      author: user?.firstName || user?.email || "Administrator",
    };
    
    if (editingEssay) {
      updateEssayMutation.mutate({ id: editingEssay.id, data });
    } else {
      createEssayMutation.mutate(data);
    }
  };

  const handleEdit = (essay: Essay) => {
    setEditingEssay(essay);
    setIsDialogOpen(true);
  };

  const handleDelete = (essay: Essay) => {
    if (window.confirm(`"${essay.title}" 에세이를 삭제하시겠습니까?`)) {
      deleteEssayMutation.mutate(essay.id);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEssay(null);
  };

  const isAdmin = !!user;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-[1000px] mx-auto">
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold font-serif text-foreground mb-2">경제 에세이</h1>
              <p className="text-muted-foreground">
                한국 경제의 심층적인 이슈와 미래 전망을 담은 분석적인 글을 공유합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!authLoading && !user && (
                <a href="/api/login">
                  <Button variant="outline" className="gap-2" data-testid="button-login">
                    <LogIn className="w-4 h-4" /> 관리자 로그인
                  </Button>
                </a>
              )}
              {isAdmin && (
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  if (!open) handleDialogClose();
                  else setIsDialogOpen(true);
                }}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-essay" className="gap-2">
                      <Plus className="w-4 h-4" /> 새 에세이
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingEssay ? "에세이 수정" : "새 에세이 작성"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="title">제목 (한국어) *</Label>
                        <Input 
                          id="title" 
                          name="title" 
                          required 
                          defaultValue={editingEssay?.title || ""}
                          data-testid="input-title" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="titleEn">제목 (English)</Label>
                        <Input 
                          id="titleEn" 
                          name="titleEn" 
                          defaultValue={editingEssay?.titleEn || ""}
                          data-testid="input-title-en" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="content">내용 (한국어) *</Label>
                        <Textarea 
                          id="content" 
                          name="content" 
                          required 
                          rows={10}
                          defaultValue={editingEssay?.content || ""}
                          data-testid="textarea-content"
                          className="font-serif"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contentEn">내용 (English)</Label>
                        <Textarea 
                          id="contentEn" 
                          name="contentEn" 
                          rows={10}
                          defaultValue={editingEssay?.contentEn || ""}
                          data-testid="textarea-content-en"
                          className="font-serif"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                          취소
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createEssayMutation.isPending || updateEssayMutation.isPending} 
                          data-testid="button-submit"
                        >
                          {(createEssayMutation.isPending || updateEssayMutation.isPending) && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          {editingEssay ? "수정 완료" : "작성 완료"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              {user && (
                <a href="/api/logout">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    로그아웃
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : essays && essays.length > 0 ? (
          <div className="space-y-8">
            {essays.map((essay) => (
              <article key={essay.id} className="group" data-testid={`essay-card-${essay.id}`}>
                <Card className="border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> 
                          {new Date(essay.publishedAt).toLocaleDateString('ko-KR')}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {essay.author}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(essay)}
                            data-testid={`button-edit-${essay.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(essay)}
                            disabled={deleteEssayMutation.isPending}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            data-testid={`button-delete-${essay.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CardTitle className="font-serif text-2xl mb-2 group-hover:text-primary transition-colors mt-2" data-testid={`essay-title-${essay.id}`}>
                      {essay.title}
                    </CardTitle>
                    {essay.titleEn && (
                      <p className="text-sm text-muted-foreground font-serif italic">{essay.titleEn}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed font-serif whitespace-pre-line" data-testid={`essay-content-${essay.id}`}>
                      {essay.content.length > 300 ? essay.content.substring(0, 300) + '...' : essay.content}
                    </p>
                  </CardContent>
                </Card>
              </article>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-20 text-center">
              <p className="text-muted-foreground">아직 작성된 에세이가 없습니다.</p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">위의 '새 에세이' 버튼을 클릭하여 첫 에세이를 작성해보세요.</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
