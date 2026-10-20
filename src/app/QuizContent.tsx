"use client";

import { createElement, memo, useEffect, useState, type ReactNode } from "react";
import { contentBlocks } from "@/lib/content";

const languages: Record<string, string> = { javascript: "javascript", js: "javascript", python: "python", py: "python", html: "xml", css: "css", json: "json" };

function safeHighlightNodes(html: string): ReactNode[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const convert = (node: Node, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element) || node.tagName !== "SPAN") return node.textContent;
    const className = node.className.split(/\s+/).filter(name => /^(hljs-[\w-]+|[\w-]+_)$/.test(name)).join(" ");
    return createElement("span", { key, className }, Array.from(node.childNodes, convert));
  };
  return Array.from(document.body.childNodes, convert);
}

function CodeBlock({ text, language }: { text: string; language: string }) {
  const [highlighted, setHighlighted] = useState<{ text: string; language: string; nodes: ReactNode[] } | null>(null);
  const supported = Object.hasOwn(languages, language) ? languages[language] : undefined;
  useEffect(() => {
    if (!supported) return;
    let active = true;
    import("@/lib/highlightCode").then(({ highlightCode }) => {
      const nodes = safeHighlightNodes(highlightCode(text, supported));
      if (active) setHighlighted({ text, language, nodes });
    }).catch(() => {
      // Syntax colors are optional; retain the original code if the chunk cannot load.
      if (active) setHighlighted(null);
    });
    return () => { active = false; };
  }, [text, language, supported]);
  return <pre className="quiz-code" dir="ltr" tabIndex={0} aria-label="كود برمجي"><code>{highlighted?.text === text && highlighted.language === language ? highlighted.nodes : text}</code></pre>;
}

export default memo(function QuizContent({ text }: { text: string }) {
  return <span className="quiz-content">{contentBlocks(text).map((block, index) => block.kind === "code"
    ? <CodeBlock key={index} text={block.text} language={block.language}/>
    : <span className="quiz-prose" key={index}>{block.text}</span>)}</span>;
});
