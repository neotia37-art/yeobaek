export const ENTRY_KINDS = ["excerpt", "thought", "idea", "action"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const KIND_META: Record<
  EntryKind,
  { label: string; short: string; hint: string }
> = {
  excerpt: {
    label: "책의 내용",
    short: "내용",
    hint: "저자가 실제로 말한 것. 해석을 섞지 않는다.",
  },
  thought: {
    label: "나의 생각",
    short: "생각",
    hint: "읽으며 일어난 반응, 동의, 저항, 질문.",
  },
  idea: {
    label: "발전된 아이디어",
    short: "아이디어",
    hint: "책을 넘어 내가 확장·연결한 가설.",
  },
  action: {
    label: "실행할 점",
    short: "실행",
    hint: "이번 주에 해볼 수 있는 구체적인 행동.",
  },
};

export type CoverTone = 0 | 1 | 2 | 3 | 4;

export type Book = {
  id: string;
  title: string;
  author: string;
  subtitle?: string;
  coverTone: CoverTone;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  bookId: string;
  passNumber: number;
  title: string;
  intent: string;
  createdAt: string;
  source: "manual" | "conversation";
};

export type Entry = {
  id: string;
  bookId: string;
  sessionId: string;
  kind: EntryKind;
  title: string;
  body: string;
  tags: string[];
  ideaIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type Idea = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationDraft = {
  sessionTitle: string;
  summary: string;
  entries: Array<{
    kind: EntryKind;
    title: string;
    body: string;
    tags: string[];
    linkedIdeaTitles: string[];
  }>;
  suggestedIdeas: Array<{ title: string; summary: string }>;
};

export type JournalState = {
  books: Book[];
  sessions: Session[];
  entries: Entry[];
  ideas: Idea[];
};
