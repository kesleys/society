import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Notification = { id: string; title: string; body: string; date: string; read: boolean };
export type Sponsor = {
  id: string;
  name: string;
  tier: "Diamante" | "Ouro" | "Prata" | "Bronze";
  category: string;
  since: string;
  contribution: string;
  url: string;
  initials: string;
  color: string;
};
export type Comment = { id: string; author: string; text: string; date: string };
export type Article = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  authorAvatar: string;
  date: string;
  tag: string;
  cover: string;
  comments: Comment[];
  likes: number;
};

export type Section = "dashboard" | "stats" | "history" | "members" | "hall" | "calendar" | "sponsors" | "press" | "wiki";

type Store = {
  presence: Record<string, "in" | "out" | undefined>;
  togglePresence: (matchId: string) => void;
  setPresence: (matchId: string, v: "in" | "out") => void;
  sponsors: Sponsor[];
  addSponsor: (s: Omit<Sponsor, "id" | "initials" | "color">) => void;
  removeSponsor: (id: string) => void;
  articles: Article[];
  addArticle: (a: Omit<Article, "id" | "comments" | "likes" | "date">) => void;
  addComment: (articleId: string, text: string) => void;
  likeArticle: (articleId: string) => void;
  notifications: Notification[];
  markAllRead: () => void;
  pushNotification: (n: Omit<Notification, "id" | "date" | "read">) => void;
  navigate: (s: Section) => void;
};

const Ctx = createContext<Store | null>(null);

const KEY = "sabados-fc-store-v1";

const seedSponsors: Sponsor[] = [];

const seedArticles: Article[] = [];

const colors = ["#4FC3F7", "#C586C0", "#DCDCAA", "#F48771", "#89D185", "#FFD700"];

export function StoreProvider({ children, navigate }: { children: ReactNode; navigate: (s: Section) => void }) {
  const [presence, setPresenceState] = useState<Store["presence"]>({});
  const [sponsors, setSponsors] = useState<Sponsor[]>(seedSponsors);
  const [articles, setArticles] = useState<Article[]>(seedArticles);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.presence) setPresenceState(data.presence);
        if (data.sponsors) setSponsors(data.sponsors);
        if (data.articles) setArticles(data.articles);
        if (data.notifications) setNotifications(data.notifications);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ presence, sponsors, articles, notifications }));
    } catch {}
  }, [presence, sponsors, articles, notifications]);

  const pushNotification: Store["pushNotification"] = (n) => {
    setNotifications((prev) => [
      { id: `n-${Date.now()}`, date: new Date().toISOString().slice(0, 10), read: false, ...n },
      ...prev,
    ]);
  };

  const value: Store = {
    presence,
    togglePresence: (matchId) =>
      setPresenceState((p) => ({ ...p, [matchId]: p[matchId] === "in" ? "out" : "in" })),
    setPresence: (matchId, v) => setPresenceState((p) => ({ ...p, [matchId]: v })),
    sponsors,
    addSponsor: (s) => {
      const initials = s.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const color = colors[Math.floor(Math.random() * colors.length)];
      setSponsors((prev) => [{ ...s, id: `s-${Date.now()}`, initials, color }, ...prev]);
      pushNotification({ title: "Novo patrocinador!", body: `${s.name} entrou no time de apoiadores.` });
    },
    removeSponsor: (id) => setSponsors((prev) => prev.filter((s) => s.id !== id)),
    articles,
    addArticle: (a) => {
      setArticles((prev) => [
        { ...a, id: `a-${Date.now()}`, comments: [], likes: 0, date: new Date().toISOString().slice(0, 10) },
        ...prev,
      ]);
      pushNotification({ title: "Nova matéria publicada", body: a.title });
    },
    addComment: (articleId, text) =>
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleId
            ? { ...a, comments: [...a.comments, { id: `c-${Date.now()}`, author: "Você", text, date: new Date().toISOString().slice(0, 10) }] }
            : a
        )
      ),
    likeArticle: (articleId) =>
      setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, likes: a.likes + 1 } : a))),
    notifications,
    markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
    pushNotification,
    navigate,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
