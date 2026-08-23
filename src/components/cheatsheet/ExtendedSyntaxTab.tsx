import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

const ExtendedSyntaxTab: React.FC = () => (
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
);

export default ExtendedSyntaxTab;
