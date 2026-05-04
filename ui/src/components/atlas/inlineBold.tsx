import type { ReactNode } from "react";

/** Renders `**segments**` as `<strong>`; leaves unmatched `**` as literal text. */
export function renderBoldMarkdown(text: string): ReactNode {
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
