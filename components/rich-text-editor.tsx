"use client";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, List, ListOrdered, Heading2, Heading3, Link as LinkIcon,
  Undo, Redo, Quote,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here…",
  disabled,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline text-primary" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    // Explicitly enable client-side rendering, avoids Next.js SSR mismatch
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[240px] px-4 py-3 focus:outline-none",
          "prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
        ),
      },
    },
  });

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      <Toolbar editor={editor} disabled={disabled} />
      <Separator />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, disabled }: { editor: Editor; disabled?: boolean }) {
  const addLink = useCallback(() => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        disabled={disabled}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        disabled={disabled}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        disabled={disabled}
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        disabled={disabled}
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        disabled={disabled}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        disabled={disabled}
        aria-label="Ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        disabled={disabled}
        aria-label="Quote"
      >
        <Quote className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={addLink}
        disabled={disabled}
        aria-label="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Toggle>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() => editor.chain().focus().undo().run()}
        disabled={disabled || !editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={() => editor.chain().focus().redo().run()}
        disabled={disabled || !editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Toggle>
    </div>
  );
}
