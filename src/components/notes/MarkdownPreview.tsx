import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';
import { cn } from '@/lib/utils';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Options as RehypeSanitizeOptions } from 'rehype-sanitize';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
  const enhancedSchema = useMemo<RehypeSanitizeOptions>(() => {
    const base = defaultSchema as RehypeSanitizeOptions;

    const withTagNames = Array.from(
      new Set([...(base.tagNames || []), 'mark', 'span', 'u'])
    );

    const appendAttributes = (existing: unknown, additions: string[]) => {
      const source = Array.isArray(existing) ? existing : [];
      return Array.from(new Set([...source, ...additions]));
    };

    return {
      ...base,
      tagNames: withTagNames,
      attributes: {
        ...(base.attributes || {}),
        '*': appendAttributes(base.attributes?.['*'], ['className']),
        span: appendAttributes(base.attributes?.span, ['style', 'className']),
        mark: appendAttributes(base.attributes?.mark, ['style', 'className']),
        code: appendAttributes(base.attributes?.code, ['className']),
        pre: appendAttributes(base.attributes?.pre, ['className']),
        img: appendAttributes(base.attributes?.img, [
          'src',
          'alt',
          'title',
          'width',
          'height',
          'loading',
          'className',
        ]),
      },
    };
  }, []);

  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, enhancedSchema]]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
          code({ inline, className: languageClassName, children, ...props }) {
            const match = /language-([\w-]+)/.exec(languageClassName || '');
            if (inline || !match) {
              return (
                <code className={languageClassName} {...props}>
                  {children}
                </code>
              );
            }

            const language = match[1] as Language;
            const code = String(children).replace(/\n$/, '');

            return (
              <Highlight theme={themes.nightOwl} code={code} language={language}>
                {({ className: highlightClass, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={cn('markdown-code-block', highlightClass)} style={style}>
                    {tokens.map((line, lineIndex) => (
                      <div key={lineIndex} {...getLineProps({ line })}>
                        {line.map((token, tokenIndex) => (
                          <span key={tokenIndex} {...getTokenProps({ token })} />
                        ))}
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            );
          },
          table(props) {
            return (
              <div className="markdown-table-wrapper">
                <table {...props} />
              </div>
            );
          },
          img({ alt, ...props }) {
            return <img alt={alt ?? ''} loading="lazy" {...props} className="markdown-image" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownPreview;
