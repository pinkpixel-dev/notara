import React from 'react';
import ProfileSettings from '@/components/settings/ProfileSettings';
import AppLayout from '@/components/layout/AppLayout';

const ProfileSettingsPage: React.FC = () => (
  <AppLayout>
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      <ProfileSettings />
    </div>
  </AppLayout>
);

export default ProfileSettingsPage; 