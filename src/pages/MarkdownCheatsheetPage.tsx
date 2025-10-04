import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Separator } from '@/components/ui/separator';

const MarkdownCheatsheetPage: React.FC = () => {
  return (
    <AppLayout>
      <ResizablePanel defaultSize={65} minSize={50}>
        <div className="h-full overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-cosmos-nebula to-cosmos-aurora bg-clip-text text-transparent">
            Markdown Cheat Sheet
          </h1>
          <p className="text-muted-foreground text-center mb-8">
            A quick reference to the Markdown syntax for your notes
          </p>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="basic">Basic Syntax</TabsTrigger>
              <TabsTrigger value="extended">Extended Syntax</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Headings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre># Heading 1</pre>
                      <pre>## Heading 2</pre>
                      <pre>### Heading 3</pre>
                      <pre>#### Heading 4</pre>
                      <pre>##### Heading 5</pre>
                      <pre>###### Heading 6</pre>
                    </div>
                    <div className="p-4">
                      <h1 className="text-2xl font-bold">Heading 1</h1>
                      <h2 className="text-xl font-bold">Heading 2</h2>
                      <h3 className="text-lg font-bold">Heading 3</h3>
                      <h4 className="text-base font-bold">Heading 4</h4>
                      <h5 className="text-sm font-bold">Heading 5</h5>
                      <h6 className="text-xs font-bold">Heading 6</h6>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Emphasis</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>*italic*</pre>
                      <pre>**bold**</pre>
                      <pre>~~strikethrough~~</pre>
                      <pre>*You **can** combine them*</pre>
                    </div>
                    <div className="p-4">
                      <p><em>italic</em></p>
                      <p><strong>bold</strong></p>
                      <p><del>strikethrough</del></p>
                      <p><em>You <strong>can</strong> combine them</em></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Lists</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>- Unordered item</pre>
                      <pre>- Another item</pre>
                      <pre>  - Nested item</pre>
                      <pre>  - Another nested item</pre>
                      <pre>- Last item</pre>
                      <pre>{''}</pre>
                      <pre>1. Ordered item</pre>
                      <pre>2. Another item</pre>
                      <pre>3. Last item</pre>
                    </div>
                    <div className="p-4">
                      <ul className="list-disc pl-5 mb-4">
                        <li>Unordered item</li>
                        <li>Another item
                          <ul className="list-disc pl-5 mt-1">
                            <li>Nested item</li>
                            <li>Another nested item</li>
                          </ul>
                        </li>
                        <li>Last item</li>
                      </ul>
                      
                      <ol className="list-decimal pl-5">
                        <li>Ordered item</li>
                        <li>Another item</li>
                        <li>Last item</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Links & Images</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>[Link text](https://example.com)</pre>
                      <pre>{''}</pre>
                      <pre>![Alt text](https://example.com/image.jpg)</pre>
                    </div>
                    <div className="p-4">
                      <p><a href="#" className="text-blue-500 hover:underline">Link text</a></p>
                      <p className="mt-4">Image would be displayed here</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Code</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>`inline code`</pre>
                      <pre>{''}</pre>
                      <pre>```</pre>
                      <pre>// code block</pre>
                      <pre>function hello() {'{'}</pre>
                      <pre>  console.log("Hello!");</pre>
                      <pre>{'}'}</pre>
                      <pre>```</pre>
                    </div>
                    <div className="p-4">
                      <p><code className="bg-secondary px-1 py-0.5 rounded">inline code</code></p>
                      
                      <div className="bg-secondary px-4 py-3 rounded-md mt-4">
                        <pre className="text-sm">
                          <code>
                            // code block<br />
                            function hello() {'{'}<br />
                            &nbsp;&nbsp;console.log("Hello!");<br />
                            {'}'}<br />
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Blockquotes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>{'> This is a blockquote'}</pre>
                      <pre>{'> '}</pre>
                      <pre>{'> It can span multiple lines'}</pre>
                    </div>
                    <div className="p-4">
                      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
                        <p>This is a blockquote</p>
                        <p>It can span multiple lines</p>
                      </blockquote>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Paragraphs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>First paragraph.</pre>
                      <pre>{''}</pre>
                      <pre>Second paragraph.</pre>
                      <pre>{''}</pre>
                      <pre>Line break<br />with two spaces at end.</pre>
                    </div>
                    <div className="p-4">
                      <p className="mb-4">First paragraph.</p>
                      <p className="mb-4">Second paragraph.</p>
                      <p>Line break<br />with two spaces at end.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="extended" className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Tables</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>| Header 1 | Header 2 |</pre>
                      <pre>|----------|----------|</pre>
                      <pre>| Cell 1   | Cell 2   |</pre>
                      <pre>| Cell 3   | Cell 4   |</pre>
                    </div>
                    <div className="p-4">
                      <table className="min-w-full border border-border">
                        <thead>
                          <tr>
                            <th className="border border-border p-2">Header 1</th>
                            <th className="border border-border p-2">Header 2</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-border p-2">Cell 1</td>
                            <td className="border border-border p-2">Cell 2</td>
                          </tr>
                          <tr>
                            <td className="border border-border p-2">Cell 3</td>
                            <td className="border border-border p-2">Cell 4</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Task Lists</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>- [x] Completed task</pre>
                      <pre>- [ ] Incomplete task</pre>
                      <pre>- [x] Another completed task</pre>
                    </div>
                    <div className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <input type="checkbox" checked readOnly className="mr-2" />
                          <span>Completed task</span>
                        </div>
                        <div className="flex items-center">
                          <input type="checkbox" readOnly className="mr-2" />
                          <span>Incomplete task</span>
                        </div>
                        <div className="flex items-center">
                          <input type="checkbox" checked readOnly className="mr-2" />
                          <span>Another completed task</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Footnotes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>Here's a sentence with a footnote.[^1]</pre>
                      <pre>{''}</pre>
                      <pre>[^1]: This is the footnote.</pre>
                    </div>
                    <div className="p-4">
                      <p>Here's a sentence with a footnote.<sup>1</sup></p>
                      <div className="mt-4 text-sm border-t border-border pt-2">
                        <p><sup>1</sup> This is the footnote.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Definition Lists</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>term</pre>
                      <pre>: definition</pre>
                    </div>
                    <div className="p-4">
                      <dl>
                        <dt className="font-semibold">term</dt>
                        <dd className="pl-4">definition</dd>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Horizontal Rule</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>---</pre>
                      <pre>{''}</pre>
                      <pre>***</pre>
                      <pre>{''}</pre>
                      <pre>___</pre>
                    </div>
                    <div className="p-4">
                      <hr className="my-4 border-t border-border" />
                      <p className="text-sm text-muted-foreground">All three options produce the same horizontal rule</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">Code Blocks with Syntax Highlighting</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-md font-mono">
                      <pre>```javascript</pre>
                      <pre>function add(a, b) {'{'}</pre>
                      <pre>  return a + b;</pre>
                      <pre>{'}'}</pre>
                      <pre>```</pre>
                    </div>
                    <div className="p-4">
                      <div className="bg-secondary px-4 py-3 rounded-md text-sm">
                        <div className="text-xs text-muted-foreground mb-2">javascript</div>
                        <pre>
                          <code>
                            <span className="text-blue-400">function</span> <span className="text-yellow-400">add</span>(<span className="text-green-400">a</span>, <span className="text-green-400">b</span>) {'{'}<br />
                            &nbsp;&nbsp;<span className="text-blue-400">return</span> a + b;<br />
                            {'}'}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

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
          </Tabs>
        </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="bg-border/30" />

      <ResizablePanel defaultSize={35} minSize={25}>
        <div className="h-full overflow-y-auto bg-card/50 backdrop-blur-xl border-l border-border/40 px-5 py-6 space-y-6">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-lg">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">**bold**</span>
                <p>Wrap text with double asterisks for emphasis.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">*italic*</span>
                <p>Single asterisks or underscores make text italic.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">`code`</span>
                <p>Use backticks for inline code snippets or commands.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">{'>'} quote</span>
                <p>Add inspirational callouts or references with blockquotes.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">[text](url)</span>
                <p>Link to resources right from your notes.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-lg">Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toggle preview</span>
                <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + P</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Bold selection</span>
                <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + B</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Italic selection</span>
                <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + I</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Insert link</span>
                <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">Ctrl/Cmd + K</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Create checkbox</span>
                <span className="font-mono text-xs bg-background/60 px-2 py-1 rounded-md">- [ ]</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-lg">Templates & Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h3 className="text-foreground font-medium mb-2">Starter Templates</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">## Meeting Notes</span>
                    <p>Track attendees, agenda, and action items with headings and task lists.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">### Daily Log</span>
                    <p>Use headings for each day and bullet lists to capture quick updates.</p>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">#### Idea Vault</span>
                    <p>Combine quotes, images, and code blocks to store inspiration.</p>
                  </li>
                </ul>
              </div>

              <Separator className="bg-border/40" />

              <div>
                <h3 className="text-foreground font-medium mb-2">Export Tips</h3>
                <p className="mb-2">Use fenced code blocks (<span className="font-mono text-xs">```language</span>) for syntax highlighting and clean exports.</p>
                <p className="mb-2">Notebook PDFs look best with headings structured from <span className="font-mono text-xs">#</span> down to <span className="font-mono text-xs">###</span>.</p>
                <p>Embed links to Constellation and Vision Boards so generated summaries stay contextual.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default MarkdownCheatsheetPage;
