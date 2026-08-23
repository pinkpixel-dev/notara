import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

const AdvancedSyntaxTab: React.FC = () => (
  <TabsContent value="advanced" className="space-y-6">
    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Emoji & Symbols</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>:smile: :heart: :rocket:</pre>
            <pre>{''}</pre>
            <pre>:warning: :books: :bulb:</pre>
          </div>
          <div className="p-4">
            <p className="text-xl">😄 ❤️ 🚀</p>
            <p className="text-xl mt-2">⚠️ 📚 💡</p>
            <p className="text-sm text-muted-foreground mt-2">Not all Markdown processors support emoji shortcodes</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Table Alignment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>| Left | Center | Right |</pre>
            <pre>|:-----|:------:|------:|</pre>
            <pre>| 1    | 2      | 3     |</pre>
            <pre>| 4    | 5      | 6     |</pre>
          </div>
          <div className="p-4">
            <table className="min-w-full border border-border">
              <thead>
                <tr>
                  <th className="border border-border p-2 text-left">Left</th>
                  <th className="border border-border p-2 text-center">Center</th>
                  <th className="border border-border p-2 text-right">Right</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2 text-left">1</td>
                  <td className="border border-border p-2 text-center">2</td>
                  <td className="border border-border p-2 text-right">3</td>
                </tr>
                <tr>
                  <td className="border border-border p-2 text-left">4</td>
                  <td className="border border-border p-2 text-center">5</td>
                  <td className="border border-border p-2 text-right">6</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Subscript & Superscript</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>H~2~O (subscript)</pre>
            <pre>{''}</pre>
            <pre>X^2^ (superscript)</pre>
          </div>
          <div className="p-4">
            <p>H<sub>2</sub>O (subscript)</p>
            <p className="mt-2">X<sup>2</sup> (superscript)</p>
            <p className="text-sm text-muted-foreground mt-2">Requires extended syntax support</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Math Expressions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>Inline: $E=mc^2$</pre>
            <pre>{''}</pre>
            <pre>Block:</pre>
            <pre>$$</pre>
            <pre>\frac{'{'}-b \pm \sqrt{'{'}b^2-4ac{'}'}{'{'}2a{'}'}</pre>
            <pre>$$</pre>
          </div>
          <div className="p-4">
            <p>Inline: <span className="font-mono">E=mc²</span></p>
            <div className="mt-4 py-2 font-mono text-center">
              <p>(-b ± √(b² - 4ac)) / 2a</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Requires LaTeX/KaTeX support</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Link References</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>This is [a link][1] reference.</pre>
            <pre>{''}</pre>
            <pre>[1]: https://example.com "Title"</pre>
          </div>
          <div className="p-4">
            <p>This is <a href="#" className="text-blue-500 hover:underline">a link</a> reference.</p>
            <p className="text-sm text-muted-foreground mt-4">References can be placed anywhere in the document</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Abbreviations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>The HTML specification.</pre>
            <pre>{''}</pre>
            <pre>*[HTML]: Hyper Text Markup Language</pre>
          </div>
          <div className="p-4">
            <p>The <abbr title="Hyper Text Markup Language" className="cursor-help border-dotted border-b">HTML</abbr> specification.</p>
            <p className="text-sm text-muted-foreground mt-2">Requires extended syntax support</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Mermaid Diagrams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>```mermaid</pre>
            <pre>graph TD;</pre>
            <pre>  A{'-'}{'>'}B;</pre>
            <pre>  A{'-'}{'>'}C;</pre>
            <pre>  B{'-'}{'>'}D;</pre>
            <pre>  C{'-'}{'>'}D;</pre>
            <pre>```</pre>
          </div>
          <div className="p-4">
            <div className="bg-secondary p-3 rounded-md">
              <p className="text-center text-sm text-muted-foreground">Diagram would render here:</p>
              <div className="flex items-center justify-center py-4">
                <pre className="text-xs text-center">
                  A<br />
                  ↙&nbsp;&nbsp;↘<br />
                  B&nbsp;&nbsp;&nbsp;C<br />
                  ↘&nbsp;&nbsp;↙<br />
                  D
                </pre>
              </div>
              <p className="text-xs text-muted-foreground text-center">Requires Mermaid.js support</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">HTML in Markdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>{'<details>'}</pre>
            <pre>{'<summary>Click to expand</summary>'}</pre>
            <pre>{'Hidden content here'}</pre>
            <pre>{'</details>'}</pre>
            <pre>{''}</pre>
            <pre>{'<mark>Highlighted text</mark>'}</pre>
          </div>
          <div className="p-4">
            <details className="mb-4">
              <summary className="cursor-pointer">Click to expand</summary>
              <p className="mt-2 pl-4">Hidden content here</p>
            </details>
            <p><mark className="bg-yellow-200 px-1">Highlighted text</mark></p>
            <p className="text-sm text-muted-foreground mt-2">HTML support varies by renderer</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Comment Syntax</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-md font-mono">
            <pre>{`<!-- This is a comment -->`}</pre>
            <pre>{''}</pre>
            <pre>{`<!-- 
  Multi-line comment
  Not visible in rendered Markdown
  -->`}</pre>
          </div>
          <div className="p-4">
            <p className="text-muted-foreground">Comments are not visible in the rendered output</p>
            <p className="text-sm text-muted-foreground mt-4">Use comments to leave notes in your document that readers won't see</p>
          </div>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
);

export default AdvancedSyntaxTab;
