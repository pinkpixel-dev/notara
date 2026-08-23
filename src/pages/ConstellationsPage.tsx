
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ConstellationView from '@/components/constellation/ConstellationView';

const ConstellationsPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="h-full min-h-0">
        <div className="h-full">
          <ConstellationView />
        </div>
      </div>
    </AppLayout>
  );
};

export default ConstellationsPage;
