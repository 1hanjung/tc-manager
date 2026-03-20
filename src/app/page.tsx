"use client";

import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Link from "next/link";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  );
}

type Project = {
  id: number;
  name: string;
  description?: string;
  _count: { testCases: number };
};

type TestCase = {
  id: number;
  title: string;
  description?: string;
  precondition?: string;
  steps: string;
  expected: string;
  status: "PENDING" | "PASS" | "FAIL";
  priority: "LOW" | "MEDIUM" | "HIGH";
  projectId: number;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "보류",
  PASS: "통과",
  FAIL: "실패",
};

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive"> = {
  PENDING: "secondary",
  PASS: "default",
  FAIL: "destructive",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

function App() {
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 프로젝트 목록 조회
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetch("/api/projects").then((r) => r.json()),
  });

  // 테스트 케이스 목록 조회
  const { data: testCases = [] } = useQuery<TestCase[]>({
    queryKey: ["testCases", selectedProject?.id],
    queryFn: () =>
      fetch(`/api/test-cases?projectId=${selectedProject?.id}`).then((r) =>
        r.json()
      ),
    enabled: !!selectedProject,
  });

  // 프로젝트 생성
  const createProject = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("프로젝트가 생성되었습니다.");
    },
  });

  // 프로젝트 삭제
  const deleteProject = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setSelectedProject(null);
      toast.success("프로젝트가 삭제되었습니다.");
    },
  });

  // 테스트 케이스 생성
  const createTestCase = useMutation({
    mutationFn: (data: Omit<TestCase, "id" | "status">) =>
      fetch("/api/test-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testCases", selectedProject?.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("테스트 케이스가 추가되었습니다.");
    },
  });

  // 테스트 케이스 상태 변경
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/test-cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testCases", selectedProject?.id] });
      toast.success("상태가 변경되었습니다.");
    },
  });

  // 테스트 케이스 삭제
  const deleteTestCase = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/test-cases/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["testCases", selectedProject?.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("테스트 케이스가 삭제되었습니다.");
    },
  });

  // 통계
  const stats = {
    total: testCases.length,
    pass: testCases.filter((t) => t.status === "PASS").length,
    fail: testCases.filter((t) => t.status === "FAIL").length,
    pending: testCases.filter((t) => t.status === "PENDING").length,
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 사이드바 - 프로젝트 목록 */}
      <aside className="w-72 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="font-bold text-lg">TC Manager</h1>
          <CreateProjectDialog
            onSubmit={(data) => createProject.mutate(data)}
          />
        </div>
        {/* URL 테스트 메뉴 */}
        <div className="px-2 py-2 border-b">
          <Link
            href="/url-test"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
          >
            🔍 URL 자동 테스트
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors hover:bg-accent cursor-pointer ${
                selectedProject?.id === project.id ? "bg-accent" : ""
              }`}
            >
              <div className="font-medium text-sm">{project.name}</div>
              <div className="text-xs text-muted-foreground">
                {project._count.testCases}개의 테스트 케이스
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              프로젝트를 추가해보세요
            </p>
          )}
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedProject ? (
          <>
            {/* 헤더 */}
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedProject.name}</h2>
                {selectedProject.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedProject.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <CreateTestCaseDialog
                  projectId={selectedProject.id}
                  onSubmit={(data) => createTestCase.mutate(data)}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteProject.mutate(selectedProject.id)}
                >
                  프로젝트 삭제
                </Button>
              </div>
            </div>

            {/* 통계 카드 */}
            <div className="p-6 grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    전체
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    통과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.pass}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    실패
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.fail}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    보류
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-500">
                    {stats.pending}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 테스트 케이스 테이블 */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>제목</TableHead>
                    <TableHead>우선순위</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>상태 변경</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((tc) => (
                    <TableRow key={tc.id}>
                      <TableCell>
                        <div className="font-medium">{tc.title}</div>
                        {tc.description && (
                          <div className="text-xs text-muted-foreground">
                            {tc.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PRIORITY_LABEL[tc.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLOR[tc.status]}>
                          {STATUS_LABEL[tc.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() =>
                              updateStatus.mutate({
                                id: tc.id,
                                status: "PASS",
                              })
                            }
                          >
                            통과
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() =>
                              updateStatus.mutate({
                                id: tc.id,
                                status: "FAIL",
                              })
                            }
                          >
                            실패
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                id: tc.id,
                                status: "PENDING",
                              })
                            }
                          >
                            보류
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteTestCase.mutate(tc.id)}
                        >
                          삭제
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {testCases.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-8"
                      >
                        테스트 케이스가 없습니다. 추가해보세요!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">프로젝트를 선택하세요</p>
              <p className="text-sm mt-1">
                왼쪽에서 프로젝트를 선택하거나 새로 만드세요
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// 프로젝트 생성 다이얼로그
function CreateProjectDialog({
  onSubmit,
}: {
  onSubmit: (data: { name: string; description: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({ name, description });
    setName("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ 프로젝트</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로젝트</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>프로젝트명</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름 입력"
            />
          </div>
          <div>
            <Label>설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 설명"
            />
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            생성
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 테스트 케이스 생성 다이얼로그
function CreateTestCaseDialog({
  projectId,
  onSubmit,
}: {
  projectId: number;
  onSubmit: (data: Omit<TestCase, "id" | "status">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [precondition, setPrecondition] = useState("");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  const handleSubmit = () => {
    if (!title.trim() || !steps.trim() || !expected.trim()) return;
    onSubmit({
      title,
      description,
      precondition,
      steps: steps.split("\n").filter(Boolean),
      expected,
      priority: priority as TestCase["priority"],
      projectId,
    });
    setTitle("");
    setDescription("");
    setPrecondition("");
    setSteps("");
    setExpected("");
    setPriority("MEDIUM");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ 테스트 케이스</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>새 테스트 케이스</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label>제목 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="테스트 케이스 제목"
            />
          </div>
          <div>
            <Label>설명</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="테스트 케이스 설명"
            />
          </div>
          <div>
            <Label>사전 조건</Label>
            <Input
              value={precondition}
              onChange={(e) => setPrecondition(e.target.value)}
              placeholder="예: 로그인 상태"
            />
          </div>
          <div>
            <Label>테스트 단계 * (줄바꿈으로 구분)</Label>
            <Textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder={"1. 로그인 페이지 접속\n2. 아이디/비밀번호 입력\n3. 로그인 버튼 클릭"}
              rows={4}
            />
          </div>
          <div>
            <Label>기대 결과 *</Label>
            <Textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder="예: 메인 페이지로 이동됨"
              rows={2}
            />
          </div>
          <div>
            <Label>우선순위</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">낮음</SelectItem>
                <SelectItem value="MEDIUM">보통</SelectItem>
                <SelectItem value="HIGH">높음</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit}>
            추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
