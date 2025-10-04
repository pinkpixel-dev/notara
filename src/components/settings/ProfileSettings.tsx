import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const ProfileSettings = () => (
  <Card>
    <CardHeader>
      <CardTitle>Profile Settings</CardTitle>
      <CardDescription>
        Authentication is turned off while Notara runs in local-only mode.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <AlertCircle className="h-12 w-12 text-primary" />
        <div>
          <p className="font-medium text-foreground">Shared workspaces are on the roadmap.</p>
          <p className="text-sm mt-2">
            When collaborative features ship, profile management and sign-in will return here.
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ProfileSettings;
