import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = {
  content: string;
  compact?: boolean;
};

export default function MarkdownContent({ content, compact = false }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h3 className="mb-3 font-display text-xl font-semibold leading-7 last:mb-0">{children}</h3>,
        h2: ({ children }) => <h4 className="mb-3 font-display text-lg font-semibold leading-7 last:mb-0">{children}</h4>,
        h3: ({ children }) => <h5 className="mb-2 font-semibold leading-6 last:mb-0">{children}</h5>,
        p: ({ children }) => <p className={compact ? "" : "mb-3 last:mb-0"}>{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-primary/45 pl-4 text-muted-foreground last:mb-0">{children}</blockquote>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline decoration-primary/45 underline-offset-2 hover:decoration-primary">{children}</a>,
        pre: ({ children }) => <pre className="my-4 max-w-full overflow-x-auto rounded-xl border border-border bg-background px-4 py-3 text-left text-[13px] leading-6 shadow-inner last:mb-0">{children}</pre>,
        code: ({ className, children, ...props }) => {
          const isBlock = Boolean(className?.includes("language-")) || String(children).includes("\n");
          return <code className={isBlock ? `font-mono ${className ?? ""}` : "rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.88em] text-foreground"} {...props}>{children}</code>;
        },
        table: ({ children }) => <table className="my-4 block max-w-full overflow-x-auto border-collapse text-sm last:mb-0">{children}</table>,
        th: ({ children }) => <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-border px-3 py-2 align-top">{children}</td>,
        hr: () => <hr className="my-4 border-border" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
