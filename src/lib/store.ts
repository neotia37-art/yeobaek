import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { SEED } from "./seed";
import type { Book, CoverTone, Entry, EntryKind, Idea, JournalState, Session } from "./types";
import { uid } from "./utils";

type Actions = {
  addBook: (input: { title: string; author: string; subtitle?: string; coverTone?: CoverTone }) => string;
  updateBook: (id: string, patch: Partial<Pick<Book, "title" | "author" | "subtitle" | "coverTone">>) => void;
  removeBook: (id: string) => void;
  addSession: (input: {
    bookId: string;
    title: string;
    intent?: string;
    source?: Session["source"];
  }) => string;
  updateSession: (id: string, patch: Partial<Pick<Session, "title" | "intent">>) => void;
  addEntry: (input: {
    bookId: string;
    sessionId: string;
    kind: EntryKind;
    title: string;
    body: string;
    tags?: string[];
    ideaIds?: string[];
  }) => string;
  updateEntry: (id: string, patch: Partial<Pick<Entry, "title" | "body" | "tags" | "ideaIds" | "kind">>) => void;
  removeEntry: (id: string) => void;
  addIdea: (input: { title: string; summary: string; tags?: string[] }) => string;
  updateIdea: (id: string, patch: Partial<Pick<Idea, "title" | "summary" | "tags">>) => void;
  removeIdea: (id: string) => void;
  linkEntryToIdea: (entryId: string, ideaId: string) => void;
  applyConversation: (input: {
    bookId: string;
    sessionTitle: string;
    intent: string;
    entries: Array<{
      kind: EntryKind;
      title: string;
      body: string;
      tags: string[];
      ideaTitles: string[];
    }>;
    newIdeas: Array<{ title: string; summary: string }>;
  }) => string;
};

export const useJournal = create<JournalState & Actions>()(
  persist(
    (set, get) => ({
      ...SEED,
      addBook: ({ title, author, subtitle, coverTone }) => {
        const id = uid("book");
        const now = new Date().toISOString();
        const book: Book = {
          id,
          title: title.trim(),
          author: author.trim(),
          subtitle: subtitle?.trim() || undefined,
          coverTone: coverTone ?? ((get().books.length % 5) as CoverTone),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ books: [book, ...s.books] }));
        return id;
      },
      updateBook: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          books: s.books.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: now } : b)),
        }));
      },
      removeBook: (id) => {
        set((s) => ({
          books: s.books.filter((b) => b.id !== id),
          sessions: s.sessions.filter((x) => x.bookId !== id),
          entries: s.entries.filter((x) => x.bookId !== id),
        }));
      },
      addSession: ({ bookId, title, intent, source }) => {
        const id = uid("ses");
        const now = new Date().toISOString();
        const passNumber =
          Math.max(0, ...get().sessions.filter((x) => x.bookId === bookId).map((x) => x.passNumber)) + 1;
        const session: Session = {
          id,
          bookId,
          passNumber,
          title: title.trim() || `${passNumber}회독`,
          intent: intent?.trim() || "",
          createdAt: now,
          source: source ?? "manual",
        };
        set((s) => ({
          sessions: [...s.sessions, session],
          books: s.books.map((b) => (b.id === bookId ? { ...b, updatedAt: now } : b)),
        }));
        return id;
      },
      updateSession: (id, patch) => {
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        }));
      },
      addEntry: ({ bookId, sessionId, kind, title, body, tags, ideaIds }) => {
        const id = uid("ent");
        const now = new Date().toISOString();
        const entry: Entry = {
          id,
          bookId,
          sessionId,
          kind,
          title: title.trim(),
          body: body.trim(),
          tags: cleanTags(tags),
          ideaIds: ideaIds ?? [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          entries: [...s.entries, entry],
          books: s.books.map((b) => (b.id === bookId ? { ...b, updatedAt: now } : b)),
        }));
        return id;
      },
      updateEntry: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...patch,
                  tags: patch.tags ? cleanTags(patch.tags) : e.tags,
                  updatedAt: now,
                }
              : e,
          ),
        }));
      },
      removeEntry: (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
      },
      addIdea: ({ title, summary, tags }) => {
        const existing = get().ideas.find(
          (i) => i.title.trim().toLowerCase() === title.trim().toLowerCase(),
        );
        if (existing) return existing.id;
        const id = uid("idea");
        const now = new Date().toISOString();
        const idea: Idea = {
          id,
          title: title.trim(),
          summary: summary.trim(),
          tags: cleanTags(tags),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ ideas: [idea, ...s.ideas] }));
        return id;
      },
      updateIdea: (id, patch) => {
        const now = new Date().toISOString();
        set((s) => ({
          ideas: s.ideas.map((i) =>
            i.id === id
              ? { ...i, ...patch, tags: patch.tags ? cleanTags(patch.tags) : i.tags, updatedAt: now }
              : i,
          ),
        }));
      },
      removeIdea: (id) => {
        set((s) => ({
          ideas: s.ideas.filter((i) => i.id !== id),
          entries: s.entries.map((e) => ({ ...e, ideaIds: e.ideaIds.filter((x) => x !== id) })),
        }));
      },
      linkEntryToIdea: (entryId, ideaId) => {
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === entryId && !e.ideaIds.includes(ideaId)
              ? { ...e, ideaIds: [...e.ideaIds, ideaId] }
              : e,
          ),
        }));
      },
      applyConversation: ({ bookId, sessionTitle, intent, entries, newIdeas }) => {
        const sessionId = get().addSession({
          bookId,
          title: sessionTitle,
          intent,
          source: "conversation",
        });
        const titleToId = new Map(get().ideas.map((i) => [i.title.trim().toLowerCase(), i.id]));
        for (const idea of newIdeas) {
          if (!idea.title.trim()) continue;
          const id = get().addIdea(idea);
          titleToId.set(idea.title.trim().toLowerCase(), id);
        }
        for (const entry of entries) {
          const ideaIds = entry.ideaTitles
            .map((t) => titleToId.get(t.trim().toLowerCase()))
            .filter((x): x is string => Boolean(x));
          get().addEntry({
            bookId,
            sessionId,
            kind: entry.kind,
            title: entry.title,
            body: entry.body,
            tags: entry.tags,
            ideaIds,
          });
        }
        return sessionId;
      },
    }),
    {
      name: "yeobaek-journal",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      skipHydration: true,
      partialize: (s) => ({
        books: s.books,
        sessions: s.sessions,
        entries: s.entries,
        ideas: s.ideas,
      }),
    },
  ),
);

function cleanTags(tags?: string[]) {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().replace(/^#/, "");
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.slice(0, 8);
}

export function bookSessions(state: JournalState, bookId: string) {
  return state.sessions
    .filter((s) => s.bookId === bookId)
    .sort((a, b) => a.passNumber - b.passNumber);
}

export function sessionEntries(state: JournalState, sessionId: string) {
  return state.entries
    .filter((e) => e.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function ideaBooks(state: JournalState, ideaId: string) {
  const bookIds = new Set(
    state.entries.filter((e) => e.ideaIds.includes(ideaId)).map((e) => e.bookId),
  );
  return state.books.filter((b) => bookIds.has(b.id));
}

export function ideaEntries(state: JournalState, ideaId: string) {
  return state.entries.filter((e) => e.ideaIds.includes(ideaId));
}

export function allTags(state: JournalState) {
  const counts = new Map<string, number>();
  for (const e of state.entries) {
    for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  for (const i of state.ideas) {
    for (const t of i.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 8)
    .map(([t]) => t);
}
