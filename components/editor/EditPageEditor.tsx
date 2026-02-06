import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  EditorRoot,
  EditorContent,
  StarterKit,
  Placeholder,
  type EditorInstance,
  type JSONContent,
} from "novel";
import { Marked } from "marked";
import { asideTypes, type AsideType, type AsideConfig } from "../../config/aside-types";

function extractFilename(raw: string): string {
  const segment = decodeURIComponent(raw).split("/").pop() ?? "";
  const basename = segment.split("?")[0];
  return basename.replace(/\.[^.]+$/, "");
}

function extractImageMap(): Record<string, string> {
  const contentEl = document.querySelector(".sl-markdown-content");
  if (!contentEl) return {};

  const map: Record<string, string> = {};
  for (const img of contentEl.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (!src) continue;
    const name = extractFilename(src);
    if (name) map[name] = src;
  }
  return map;
}

function renderAsideHtml(config: AsideConfig, title: string, body: string): string {
  const icon = config.iconSvg
    ? `<span style="color:${config.color};display:flex;align-items:center;flex-shrink:0">${config.iconSvg}</span>`
    : "";

  return [
    `<aside style="border:1px solid ${config.color};background:${config.bgColor};padding:12px 16px;border-radius:12px;margin:1em 0;overflow:hidden">`,
    `<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">`,
    `${icon}<span style="color:${config.color};font-weight:500;font-size:18px">${title}</span>`,
    `</div>`,
    `<div style="color:var(--color-text)">${body.trim()}</div>`,
    `</aside>`,
  ].join("");
}

const ASIDE_RE = /<Aside\s+(?:type="([^"]*)")?(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/Aside>/g;

function preprocessAsides(content: string): string {
  return content.replace(
    ASIDE_RE,
    (_: string, type: string | undefined, title: string | undefined, body: string) => {
      const key = (type || "note") as AsideType;
      const config = key in asideTypes ? asideTypes[key] : asideTypes.note;
      return renderAsideHtml(config, title || config.title, body);
    },
  );
}

function createMarked(imageMap: Record<string, string>): Marked {
  const instance = new Marked({ breaks: true, gfm: true });
  instance.use({
    renderer: {
      image({ href, text }) {
        const src = imageMap[extractFilename(href)] || href;
        return `<img src="${src}" alt="${text}" style="max-width:100%;height:auto;border-radius:8px;margin:1em 0" />`;
      },
    },
  });
  return instance;
}

function mdxToPreviewHtml(source: string, md: Marked): string {
  const content = source
    .replace(/^---[\s\S]*?---\n*/, "")
    .replace(/^import\s+.*$/gm, "");

  return md.parse(preprocessAsides(content), { async: false }) as string;
}

const extensions = [
  StarterKit.configure({
    heading: false,
    bold: false,
    italic: false,
    strike: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    horizontalRule: false,
    dropcursor: false,
    gapcursor: false,
    codeBlock: {
      languageClassPrefix: "language-",
      HTMLAttributes: { class: "mdx-code-block" },
    },
  }),
  Placeholder.configure({ placeholder: "MDX 源码…" }),
];

function buildInitialContent(source: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "codeBlock",
        attrs: { language: "mdx" },
        content: source ? [{ type: "text", text: source }] : undefined,
      },
    ],
  };
}

interface EditPageEditorProps {
  source: string;
}

const EXIT_DURATION = 250;

export default function EditPageEditor({ source }: EditPageEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const initialContent = useRef<JSONContent>(buildInitialContent(source));
  const markedRef = useRef<Marked | null>(null);

  const activate = useCallback(() => {
    if (!source) return;
    const imageMap = extractImageMap();
    markedRef.current = createMarked(imageMap);
    setIsClosing(false);
    setIsEditing(true);
  }, [source]);

  const deactivate = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsEditing(false);
      setIsClosing(false);
    }, EXIT_DURATION);
  }, []);

  useEffect(() => {
    const onActivate = () => activate();
    const onDeactivate = () => deactivate();
    window.addEventListener("edit-page-activate", onActivate);
    window.addEventListener("edit-page-deactivate", onDeactivate);
    return () => {
      window.removeEventListener("edit-page-activate", onActivate);
      window.removeEventListener("edit-page-deactivate", onDeactivate);
    };
  }, [activate, deactivate]);

  useEffect(() => {
    if (isEditing && !isClosing) {
      document.body.classList.add("is-editing");
    } else if (!isEditing) {
      document.body.classList.remove("is-editing");
    }
    return () => {
      document.body.classList.remove("is-editing");
    };
  }, [isEditing, isClosing]);

  useEffect(() => {
    if (isEditing && previewRef.current && markedRef.current) {
      previewRef.current.innerHTML = mdxToPreviewHtml(
        source,
        markedRef.current,
      );
    }
  }, [isEditing, source]);

  const handleUpdate = useCallback(
    ({ editor }: { editor: EditorInstance }) => {
      if (previewRef.current && markedRef.current) {
        const text = editor.getText();
        previewRef.current.innerHTML = mdxToPreviewHtml(
          text,
          markedRef.current,
        );
      }
    },
    [],
  );

  if (!isEditing) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className={`fixed top-15 inset-x-0 bottom-0 z-100 flex flex-col md:flex-row bg-(--color-bg) ${
        isClosing
          ? "animate-[edit-exit_0.25s_ease_forwards]"
          : "animate-[edit-enter_0.3s_ease]"
      }`}
    >
      <div className="flex-none h-1/2 md:flex-1 md:h-auto flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between py-2.5 px-5 border-b border-(--color-border) text-(--color-muted) text-[13px] font-medium shrink-0">
          <span>预览</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:py-7 md:px-9 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]">
          <div ref={previewRef} className="sl-markdown-content" />
        </div>
      </div>

      <div className="h-px md:h-auto md:w-px shrink-0 bg-(--color-border)" />

      <div className="flex-none h-1/2 md:flex-1 md:h-auto flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between py-2.5 px-5 border-b border-(--color-border) text-(--color-muted) text-[13px] font-medium shrink-0">
          <span>编辑</span>
        </div>
        <div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]">
          <EditorRoot>
            <EditorContent
              extensions={extensions}
              initialContent={initialContent.current}
              className="h-full"
              editorProps={{
                attributes: {
                  class:
                    "novel-editor-code outline-none min-h-full text-(--color-text) font-mono text-sm leading-[1.6]",
                  spellcheck: "false",
                },
              }}
              onUpdate={handleUpdate}
            />
          </EditorRoot>
        </div>
      </div>
    </div>,
    document.body,
  );
}
