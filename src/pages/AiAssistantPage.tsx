
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import AiAssistant from '@/components/ai/AiAssistant';
import { ResizablePanel } from '@/components/ui/resizable';

const AiAssistantPage: React.FC = () => {
  return (
    <AppLayout>
      <ResizablePanel defaultSize={100}>
        <AiAssistant />
      </ResizablePanel>
    </AppLayout>
  );
};

export default AiAssistantPage;
