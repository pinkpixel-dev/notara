import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';

const BasicSyntaxTab: React.FC = () => (
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
);

export default BasicSyntaxTab;
