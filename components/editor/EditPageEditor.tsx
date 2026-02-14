import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
	EditorRoot,
	EditorContent,
	StarterKit,
	Placeholder,
	type EditorInstance,
	type JSONContent,
} from "novel";
import { useStore } from "@nanostores/react";
import { Marked } from "marked";
import morphdom from "morphdom";
import {
	asideTypes,
	type AsideType,
	type AsideConfig,
} from "../../config/aside-types";
import {
	captureToken,
	redirectToLogin,
	submitToGitHub,
} from "../../lib/github";
import {
	$isEditing,
	$isDirty,
	$editorContent,
	$submitStatus,
	$submitMessage,
	$submitRequested,
	restoreDraft,
	saveDraft,
	clearDraft,
	markPendingSubmit,
	consumePendingSubmit,
} from "../../stores/editor";

function extractFilename(raw: string): string {
	const segment = decodeURIComponent(raw).split("/").pop() ?? "";
	const basename = segment.split("?")[0];
	return basename.replace(/\..+$/, "");
}

function extractImageMap(): Record<string, string> {
	const contentEl = document.querySelector("main .sl-markdown-content");
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

function renderAsideHtml(
	config: AsideConfig,
	title: string,
	body: string,
): string {
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

const ASIDE_RE =
	/<Aside\s+(?:type="([^"]*)")?(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/Aside>/g;

function preprocessAsides(content: string): string {
	return content.replace(
		ASIDE_RE,
		(
			_: string,
			type: string | undefined,
			title: string | undefined,
			body: string,
		) => {
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

function morphPreview(container: HTMLElement, html: string) {
	const next = document.createElement("div");
	next.innerHTML = html;
	morphdom(container, next, {
		childrenOnly: true,
		onBeforeElUpdated(fromEl, toEl) {
			if (fromEl.isEqualNode(toEl)) return false;
			if (fromEl.tagName === "DETAILS" && toEl.tagName === "DETAILS") {
				if (fromEl.hasAttribute("open")) toEl.setAttribute("open", "");
			}
			return true;
		},
	});
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
	filePath: string;
}

const EXIT_DURATION = 250;

export default function EditPageEditor({
	source,
	filePath,
}: EditPageEditorProps) {
	const isEditing = useStore($isEditing);
	const isDirty = useStore($isDirty);

	const [isClosing, setIsClosing] = useState(false);
	const previewRef = useRef<HTMLDivElement>(null);
	const markedRef = useRef<Marked | null>(null);

	const wasEditing = useRef(false);
	if (wasEditing.current && !isEditing && !isClosing) {
		setIsClosing(true);
	}
	wasEditing.current = isEditing;

	useEffect(() => {
		if (isClosing) {
			const timer = setTimeout(() => setIsClosing(false), EXIT_DURATION);
			return () => clearTimeout(timer);
		}
	}, [isClosing]);

	const visible = isEditing || isClosing;

	const [editorKey, setEditorKey] = useState(0);
	const wasVisible = useRef(false);
	if (visible && !wasVisible.current) {
		setEditorKey((k) => k + 1);
	}
	wasVisible.current = visible;

	const draft = useMemo(() => {
		void editorKey;
		return restoreDraft(filePath, source);
	}, [filePath, source, editorKey]);
	const initialContent = useMemo(() => buildInitialContent(draft), [draft]);

	useEffect(() => {
		if (visible) {
			$editorContent.set(draft);
		}
	}, [visible, draft]);

	useEffect(() => {
		if (isEditing) {
			markedRef.current = createMarked(extractImageMap());
			document.body.classList.add("is-editing");
		} else {
			document.body.classList.remove("is-editing");
		}
		return () => document.body.classList.remove("is-editing");
	}, [isEditing]);

	useEffect(() => {
		if (isEditing && previewRef.current && markedRef.current) {
			morphPreview(
				previewRef.current,
				mdxToPreviewHtml(draft, markedRef.current),
			);
		}
	}, [isEditing, draft]);

	const handleUpdate = useCallback(
		({ editor }: { editor: EditorInstance }) => {
			const text = editor.getText();
			saveDraft(filePath, text);
			if (previewRef.current && markedRef.current) {
				morphPreview(
					previewRef.current,
					mdxToPreviewHtml(text, markedRef.current),
				);
			}
		},
		[filePath],
	);

	const handleReset = useCallback(() => {
		clearDraft(filePath);
		$editorContent.set(source);
		setEditorKey((k) => k + 1);
	}, [filePath, source]);

	const handleSubmit = useCallback(async () => {
		const token = captureToken();
		if (!token) {
			saveDraft(filePath, $editorContent.get());
			markPendingSubmit(filePath);
			redirectToLogin();
			return;
		}

		$submitStatus.set("submitting");
		$submitMessage.set("");

		try {
			const { prUrl } = await submitToGitHub(
				token,
				filePath,
				$editorContent.get(),
			);
			$submitStatus.set("success");
			$submitMessage.set(prUrl);
			clearDraft(filePath);
			window.open(prUrl, "_blank", "noopener");
		} catch (err) {
			$submitStatus.set("error");
			$submitMessage.set((err as Error).message);
		}
	}, [filePath]);

	useEffect(() => {
		return $submitRequested.subscribe((requested) => {
			if (requested) {
				$submitRequested.set(false);
				handleSubmit();
			}
		});
	}, [handleSubmit]);

	useEffect(() => {
		const token = captureToken();
		const pending = consumePendingSubmit();
		if (token && pending === filePath) {
			$isEditing.set(true);
			setTimeout(handleSubmit, 100);
		}
	}, [filePath, handleSubmit]);

	if (!visible) return null;

	return createPortal(
		<div
			key={editorKey}
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
					{isDirty && (
						<button
							type="button"
							onClick={handleReset}
							className="text-[12px] leading-none text-(--color-muted) cursor-pointer bg-transparent border-none p-0 transition-colors duration-150 hover:text-(--color-text) active:opacity-70"
						>
							恢复原文
						</button>
					)}
				</div>
				<div className="flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent]">
					<EditorRoot>
						<EditorContent
							extensions={extensions}
							initialContent={initialContent}
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
