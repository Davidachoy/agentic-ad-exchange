import type { JSX, ReactNode } from "react";

/** Renders `**segments**` as `<strong>`; leaves unmatched `**` as literal text. */
function renderBoldMarkdown(text: string): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const open = text.indexOf("**", i);
    if (open === -1) {
      out.push(text.slice(i));
      break;
    }
    if (open > i) {
      out.push(text.slice(i, open));
    }
    const close = text.indexOf("**", open + 2);
    if (close === -1) {
      out.push(text.slice(open));
      break;
    }
    out.push(<strong key={key++}>{text.slice(open + 2, close)}</strong>);
    i = close + 2;
  }
  return out;
}

export interface ChatLine {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  usedFallback?: boolean;
}

export function AtlasMessageBubble({ message }: { message: ChatLine }): JSX.Element {
  const isUser = message.role === "user";
  return (
    <article
      className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : ""}`}
      aria-label={isUser ? "You" : "Atlas assistant"}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold tracking-wide ${
          isUser
            ? "bg-[oklch(0.86_0.02_80)] text-[oklch(0.32_0.01_80)]"
            : "bg-[oklch(0.18_0.01_80)] font-atlas-mono text-white"
        }`}
      >
        {isUser ? "You" : "ATL"}
      </div>
      <div className={`min-w-0 flex-1 ${isUser ? "text-right" : ""}`}>
        <header className={`mb-1 flex flex-wrap items-baseline gap-2 ${isUser ? "justify-end" : ""}`}>
          <span className="text-[13px] font-semibold text-[oklch(0.18_0.01_80)]">{isUser ? "You" : "Atlas"}</span>
          {!isUser && (
            <span className="rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-1.5 py-0.5 font-atlas-mono text-[10px] text-[oklch(0.45_0.01_80)]">
              BUYER AGENT
            </span>
          )}
          {!isUser && message.usedFallback && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
              offline summary
            </span>
          )}
          <time className="font-atlas-mono text-[10.5px] text-[oklch(0.62_0.006_80)]" dateTime={message.createdAt}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </time>
        </header>
        <div
          className={`rounded-xl border border-[oklch(0.91_0.005_80)] bg-white px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed text-[oklch(0.22_0.01_80)] shadow-sm ${
            isUser ? "inline-block text-left" : ""
          }`}
        >
          <div className="whitespace-pre-wrap">{renderBoldMarkdown(message.content)}</div>
        </div>
      </div>
    </article>
  );
}
