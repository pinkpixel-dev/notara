
import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import CalendarView from '@/components/notes/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <AppLayout>
      <div className="h-full w-full">
        <CalendarView />
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
