import { Sidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, Plus, Loader2, Trash2, LogIn, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import type { Essay } from "@shared/schema";

export default function EssayPage() {
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState("");
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: authLoading, login, logout, authHeader } = useAuth();

  const { data: essays, isLoading } = useQuery<Essay[]>({
    queryKey: ["/api/essays"],
    queryFn: async () => {
      const res = await fetch("/api/essays");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { author: string; title: string; content: string }) => {
      const res = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create essay");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
      setIsWriteOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/essays/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete essay");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/essays"] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      author: fd.get("author") as string,
      title: fd.get("title") as string,
      content: fd.get("content") as string,
    });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await login(fd.get("password") as string);
    if (ok) {
      setIsLoginOpen(false);
      setLoginError("");
    } else {
      setLoginError("비밀번호가 올바르지 않습니다.");
    }
  };

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
              {!authLoading && !isAdmin && (
                <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <LogIn className="w-4 h-4" /> 관리자 로그인
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>관리자 로그인</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="password">비밀번호</Label>
                        <Input id="password" name="password" type="password" required autoFocus />
                        {loginError && <p className="text-sm text-red-500 mt-1">{loginError}</p>}
                      </div>
                      <Button type="submit" className="w-full">로그인</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1" onClick={logout}>
                  <LogOut className="w-4 h-4" /> 로그아웃
                </Button>
              )}

              <Dialog open={isWriteOpen} onOpenChange={setIsWriteOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> 글쓰기
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>새 에세이 작성</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="author">작성자 *</Label>
                      <Input id="author" name="author" required placeholder="홍길동" />
                    </div>
                    <div>
                      <Label htmlFor="title">제목 *</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="content">내용 *</Label>
                      <Textarea
                        id="content"
                        name="content"
                        required
                        rows={12}
                        className="font-serif"
                        placeholder="에세이 내용을 입력하세요..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsWriteOpen(false)}>
                        취소
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        작성 완료
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
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
              <article key={essay.id} className="group">
                <Card className="border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(essay.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {essay.author}
                        </span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(`"${essay.title}" 에세이를 삭제하시겠습니까?`)) {
                              deleteMutation.mutate(essay.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <CardTitle className="font-serif text-2xl mb-2 group-hover:text-primary transition-colors mt-2">
                      {essay.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed font-serif whitespace-pre-line">
                      {essay.content.length > 500 ? essay.content.substring(0, 500) + "..." : essay.content}
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
              <p className="text-sm text-muted-foreground mt-2">
                위의 '글쓰기' 버튼을 클릭하여 첫 에세이를 작성해보세요.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
