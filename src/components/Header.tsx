import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { GraduationCap, User } from 'lucide-react';

interface HeaderProps {
  showUserInfo?: boolean;
  showSignOut?: boolean;
}

export default function Header({ showUserInfo = false, showSignOut = false }: HeaderProps) {
  const { user, signOut } = useAuth();
  const profile = user?.profile;

  return (
    <header className="bg-gradient-to-r from-blue-700 to-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-10 w-10 text-blue-200" />
              <div>
                <h1 className="text-2xl font-bold">IIM-AMS</h1>
                <p className="text-sm text-blue-200">Alumni Management System</p>
              </div>
            </div>
          </div>

          {showUserInfo && user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-blue-100">
                <User className="h-5 w-5" />
                <span className="text-sm">
                  Welcome, {profile?.first_name} {profile?.last_name}
                </span>
              </div>
              {showSignOut && (
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  Sign Out
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}