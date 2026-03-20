import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 테스트 케이스 목록 조회 (projectId 필터 가능)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const testCases = await prisma.testCase.findMany({
    where: projectId ? { projectId: Number(projectId) } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(testCases);
}

// 테스트 케이스 생성
export async function POST(req: Request) {
  const body = await req.json();
  const testCase = await prisma.testCase.create({
    data: {
      title: body.title,
      description: body.description,
      precondition: body.precondition,
      steps: JSON.stringify(body.steps),
      expected: body.expected,
      priority: body.priority ?? "MEDIUM",
      status: "PENDING",
      projectId: Number(body.projectId),
    },
  });
  return NextResponse.json(testCase, { status: 201 });
}
