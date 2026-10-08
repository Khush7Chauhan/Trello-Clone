import express from "express";
import type {NextFunction, Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors({origin : APP_URL}));
app.use(
    express.json({
        verify: (req , _res, buf) =>{
            req.rawBody = buf;
        },
    }),
);

async function requireMember(
  userId: string,
  orgId: string,
  opts: { admin?: boolean } = {},
): Promise<{ id: string; role: Role }> {
  const member = await prisma.member.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { id: true, role: true },
  });
  if (!member) throw new HttpError(404, "Not found");
  if (opts.admin && member.role !== "ADMIN") throw new HttpError(403, "Admin role required");
  return member;
}

async function requireBoardMember(userId: string, boardId: string): Promise<{ id: string; role: Role; email: string }> {
  const member = await prisma.member.findFirst({
    where: { userId, org: { boards: { some: { id: boardId } } } },
    select: { id: true, role: true, user: { select: { email: true } } },
  });
  if (!member) throw new HttpError(404, "Not found");
  return { id: member.id, role: member.role, email: member.user.email };
}

async function orgOfBoard(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { organizationId: true },
  });
  if (!board) throw new HttpError(404, "Not found");
  return board.organizationId;
}

async function orgOfSection(sectionId: string): Promise<string> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { board: { select: { organizationId: true } } },
  });
  if (!section) throw new HttpError(404, "Not found");
  return section.board.organizationId;
}

async function orgOfIssue(issueId: string): Promise<string> {
  const issue = await prisma.issue.findUnique({
    relationLoadStrategy: "join",
    where: { id: issueId },
    select: { section: { select: { board: { select: { organizationId: true } } } } },
  });
  if (!issue) throw new HttpError(404, "Not found");
  return issue.section.board.organizationId;
}

async function nextSectionPosition(boardId: string): Promise<number> {
  const last = await prisma.section.findFirst({
    where: { boardId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return (last?.position ?? 0) + POSITION_GAP;
}


app.get("/health",(_req, res)=>{
    res.json({ ok : true })
});

app.post("signup" , async (req , res)=>{
    const { email , password } = parse(credential, req.body, "body");
    const user = await prisma.user.create({
        data: {email , passwordHash :  await Bun.password.hash(password)},
        select : { id : true , email : true},
    });
    res.status(201).json({ token : signToken(user.id), user});
    
});

