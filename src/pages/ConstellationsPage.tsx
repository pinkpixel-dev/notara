
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ConstellationView from '@/components/constellation/ConstellationView';
import { ResizablePanel } from '@/components/ui/resizable';

const ConstellationsPage: React.FC = () => {
  return (
    <AppLayout>
      <ResizablePanel defaultSize={100} minSize={30}>
        <div className="h-full">
          <ConstellationView />
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default ConstellationsPage;
