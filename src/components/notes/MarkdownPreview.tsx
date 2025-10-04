
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import type { Language } from 'prism-react-renderer';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}


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
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre className={cn('markdown-code-block', className)} style={style}>
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
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
