
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import AiAssistant from '@/components/ai/AiAssistant';

const AiAssistantPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="h-full">
        <AiAssistant />
      </div>
    </AppLayout>
  );
};

export default AiAssistantPage;
