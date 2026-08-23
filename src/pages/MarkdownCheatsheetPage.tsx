import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorkspacePanes, { WorkspacePaneId } from '@/components/layout/WorkspacePanes';
import BasicSyntaxTab from '@/components/cheatsheet/BasicSyntaxTab';
import ExtendedSyntaxTab from '@/components/cheatsheet/ExtendedSyntaxTab';
import AdvancedSyntaxTab from '@/components/cheatsheet/AdvancedSyntaxTab';
import QuickReference from '@/components/cheatsheet/QuickReference';

const MarkdownCheatsheetPage: React.FC = () => {
  const [activePane, setActivePane] = useState<WorkspacePaneId>('list');

  return (
    <AppLayout>
      <WorkspacePanes
        listLabel="Cheat sheet"
        detailLabel="Quick reference"
        activePane={activePane}
        onPaneChange={setActivePane}
        listDefaultSize={65}
        listMinSize={50}
        listMaxSize={80}
        list={
          <div className="h-full overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold mb-6 text-center">
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
            
            <BasicSyntaxTab />

            <ExtendedSyntaxTab />

            <AdvancedSyntaxTab />
          </Tabs>
            </div>
          </div>
        }
        detail={<QuickReference />}
      />
    </AppLayout>
  );
};

export default MarkdownCheatsheetPage;
