import { useState } from "react";
import { Clock, MessageSquare, PenSquare, Heart, Send } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useStore, type Article } from "../store";
import { Modal, Field, inputClass } from "./Modal";

const tagColor: Record<string, string> = {
  Destaque: "#FFD700",
  Análise: "#4FC3F7",
  Bastidores: "#C586C0",
  Tecnologia: "#89D185",
};

export function Press() {
  const { articles, addArticle, addComment, likeArticle } = useStore();
  const [openNew, setOpenNew] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("Todos");
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    body: "",
    author: "Você",
    authorAvatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100",
    tag: "Análise",
    cover: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800",
  });

  const reading = articles.find((a) => a.id === readingId) || null;
  const tags = ["Todos", ...Array.from(new Set(articles.map((a) => a.tag)))];
  const filtered = filter === "Todos" ? articles : articles.filter((a) => a.tag === filter);
  const [hero, ...rest] = filtered;

  const submit = () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Título e corpo são obrigatórios"); return; }
    addArticle(form);
    toast.success("Matéria publicada!");
    setForm({ ...form, title: "", excerpt: "", body: "" });
    setOpenNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Redação</h1>
          <p className="text-[#858585] text-sm">Crônicas, análises e bastidores da liga — {articles.length} matérias</p>
        </div>
        <button onClick={() => setOpenNew(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2] transition">
          <PenSquare className="w-4 h-4" /> Nova matéria
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded text-xs ${filter === t ? "bg-[#007ACC] text-white" : "bg-[#2D2D30] text-[#CCCCCC] hover:bg-[#3E3E42] border border-[#3E3E42]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Nenhuma matéria nessa categoria.
        </div>
      ) : (
        <>
          {hero && <HeroCard article={hero} onOpen={() => setReadingId(hero.id)} />}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rest.map((a) => (
              <ArticleCard key={a.id} article={a} onOpen={() => setReadingId(a.id)} />
            ))}
          </div>
        </>
      )}

      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Nova matéria" size="lg">
        <div className="space-y-4">
          <Field label="Título"><input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Manchete da matéria" /></Field>
          <Field label="Resumo"><input className={inputClass} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Frase curta que aparece na lista" /></Field>
          <Field label="Corpo"><textarea rows={6} className={inputClass} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Conteúdo completo da matéria" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tag">
              <select className={inputClass} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}>
                <option>Destaque</option><option>Análise</option><option>Bastidores</option><option>Tecnologia</option>
              </select>
            </Field>
            <Field label="URL da capa">
              <input className={inputClass} value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpenNew(false)} className="px-4 py-2 rounded-md border border-[#3E3E42] bg-[#2D2D30] text-[#D4D4D4] text-sm hover:bg-[#3E3E42]">Cancelar</button>
            <button onClick={submit} className="px-4 py-2 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2]">Publicar</button>
          </div>
        </div>
      </Modal>

      {reading && <ReadModal article={reading} onClose={() => setReadingId(null)} onLike={() => likeArticle(reading.id)} onComment={(t) => addComment(reading.id, t)} />}
    </div>
  );
}

function HeroCard({ article, onOpen }: { article: Article; onOpen: () => void }) {
  return (
    <article onClick={onOpen} className="rounded-md border border-[#3E3E42] bg-[#252526] overflow-hidden hover:border-[#007ACC] transition cursor-pointer">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <ImageWithFallback src={article.cover} alt={article.title} className="w-full h-64 md:h-full object-cover" />
        <div className="p-6 flex flex-col justify-center">
          <span className="inline-block self-start px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border" style={{ color: tagColor[article.tag], borderColor: `${tagColor[article.tag]}66`, background: `${tagColor[article.tag]}1A` }}>
            {article.tag}
          </span>
          <h2 className="text-white text-2xl tracking-tight mt-3">{article.title}</h2>
          <p className="text-[#CCCCCC] text-sm mt-3">{article.excerpt}</p>
          <div className="mt-5 flex items-center gap-3 text-xs text-[#858585] flex-wrap">
            <ImageWithFallback src={article.authorAvatar} alt={article.author} className="w-7 h-7 rounded-md object-cover border border-[#3E3E42]" />
            <span className="text-[#D4D4D4]">{article.author}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(article.date).toLocaleDateString("pt-BR")}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" />{article.comments.length}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{article.likes}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ArticleCard({ article, onOpen }: { article: Article; onOpen: () => void }) {
  return (
    <article onClick={onOpen} className="rounded-md border border-[#3E3E42] bg-[#252526] overflow-hidden hover:border-[#007ACC] transition flex flex-col cursor-pointer">
      <ImageWithFallback src={article.cover} alt={article.title} className="w-full h-40 object-cover" />
      <div className="p-5 flex-1 flex flex-col">
        <span className="inline-block self-start px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border" style={{ color: tagColor[article.tag], borderColor: `${tagColor[article.tag]}66`, background: `${tagColor[article.tag]}1A` }}>
          {article.tag}
        </span>
        <h3 className="text-white tracking-tight mt-3">{article.title}</h3>
        <p className="text-[#CCCCCC] text-sm mt-2 flex-1">{article.excerpt}</p>
        <div className="mt-4 pt-4 border-t border-[#3E3E42] flex items-center gap-2 text-xs text-[#858585]">
          <ImageWithFallback src={article.authorAvatar} alt={article.author} className="w-6 h-6 rounded-md object-cover border border-[#3E3E42]" />
          <span className="text-[#D4D4D4] truncate">{article.author}</span>
          <span className="ml-auto inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{article.likes}</span>
            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" />{article.comments.length}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

function ReadModal({ article, onClose, onLike, onComment }: { article: Article; onClose: () => void; onLike: () => void; onComment: (t: string) => void }) {
  const [text, setText] = useState("");
  const [liked, setLiked] = useState(false);

  return (
    <Modal open onClose={onClose} title={article.title} size="xl">
      <ImageWithFallback src={article.cover} alt={article.title} className="w-full h-56 object-cover rounded-md border border-[#3E3E42] mb-4" />
      <div className="flex items-center gap-3 text-xs text-[#858585] mb-4">
        <ImageWithFallback src={article.authorAvatar} alt={article.author} className="w-7 h-7 rounded-md object-cover border border-[#3E3E42]" />
        <span className="text-[#D4D4D4]">{article.author}</span>
        <span>·</span>
        <span>{new Date(article.date).toLocaleDateString("pt-BR")}</span>
        <span>·</span>
        <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border" style={{ color: tagColor[article.tag], borderColor: `${tagColor[article.tag]}66`, background: `${tagColor[article.tag]}1A` }}>{article.tag}</span>
      </div>
      <p className="text-[#D4D4D4] leading-relaxed whitespace-pre-line">{article.body}</p>

      <div className="mt-6 pt-4 border-t border-[#3E3E42] flex items-center gap-3">
        <button
          onClick={() => { onLike(); setLiked(true); toast.success("Curtido!"); }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition ${liked ? "bg-[#F48771]/15 border-[#F48771]/40 text-[#F48771]" : "bg-[#2D2D30] border-[#3E3E42] text-[#CCCCCC] hover:bg-[#3E3E42]"}`}
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} /> {article.likes + (liked ? 1 : 0)}
        </button>
        <span className="inline-flex items-center gap-2 text-sm text-[#858585]">
          <MessageSquare className="w-4 h-4" /> {article.comments.length} comentário(s)
        </span>
      </div>

      <div className="mt-6">
        <div className="text-[11px] uppercase tracking-widest text-[#858585] mb-2">Comentários</div>
        <div className="space-y-2 mb-3">
          {article.comments.length === 0 && <div className="text-sm text-[#858585]">Seja o primeiro a comentar.</div>}
          {article.comments.map((c) => (
            <div key={c.id} className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-3">
              <div className="flex items-center gap-2 text-xs text-[#858585]">
                <span className="text-[#D4D4D4]">{c.author}</span>
                <span>·</span>
                <span>{new Date(c.date).toLocaleDateString("pt-BR")}</span>
              </div>
              <div className="text-sm text-[#D4D4D4] mt-1">{c.text}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onComment(text.trim()); setText(""); toast.success("Comentário enviado"); } }}
            placeholder="Escreva um comentário..."
            className={inputClass}
          />
          <button
            onClick={() => { if (text.trim()) { onComment(text.trim()); setText(""); toast.success("Comentário enviado"); } }}
            className="px-4 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2] inline-flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
