"use client";

import ReactMarkdown from "react-markdown";

export function MarkdownPreview({ content }: { content: string }) {
  if (!content) {
    return (
      <p className="text-sm italic text-[var(--color-muted-ink)]">
        Nothing to preview...
      </p>
    );
  }

  return (
    <div className="prose prose-invert max-w-none text-sm text-[var(--color-paper)]">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
              {children}
            </h3>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-[var(--color-lime)] underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--color-lime)] pl-4 text-[var(--color-muted-ink)]">
              {children}
            </blockquote>
          ),
          code: ({ children, ...props }) => {
            const isInline = !props.className;
            if (isInline) {
              return (
                <code className="rounded bg-[var(--color-void)] px-1.5 py-0.5 text-xs">
                  {children}
                </code>
              );
            }
            return (
              <code className={props.className}>{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
