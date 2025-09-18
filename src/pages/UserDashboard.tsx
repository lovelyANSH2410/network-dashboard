import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Building, Calendar, Edit } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export default function UserDashboard() {
  const { user, isApproved, signOut } = useAuth();

  // Redirect if not approved
  if (!isApproved) {
    return <Navigate to="/waiting-approval" replace />;
  }

  const profile = user?.profile;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.first_name} {profile?.last_name}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Profile Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Profile Status</CardTitle>
                  <CardDescription>Your account is active and approved</CardDescription>
                </div>
                <Badge variant="outline" className="text-green-600">
                  ✓ Approved
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your profile was approved on {profile?.approved_at ? new Date(profile.approved_at).toLocaleDateString() : 'N/A'}
              </p>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Personal Information</CardTitle>
                <Link to="/profile">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Name:</strong> {profile?.first_name} {profile?.last_name}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Email:</strong> {profile?.email}
                  </span>
                </div>
                
                {profile?.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Phone:</strong> {profile.phone}
                    </span>
                  </div>
                )}
                
                {(profile?.city || profile?.country) && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Location:</strong> {profile?.city}{profile?.city && profile?.country && ', '}{profile?.country}
                    </span>
                  </div>
                )}
                
                {profile?.organization && (
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Organization:</strong> {profile.organization}
                    </span>
                  </div>
                )}
                
                {profile?.position && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Position:</strong> {profile.position}
                    </span>
                  </div>
                )}
              </div>

              {profile?.bio && (
                <div className="mt-4">
                  <strong className="text-sm">Bio:</strong>
                  <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
                </div>
              )}

              {profile?.skills && profile.skills.length > 0 && (
                <div>
                  <strong className="text-sm">Skills:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile?.interests && profile.interests.length > 0 && (
                <div>
                  <strong className="text-sm">Interests:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your account and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/profile">
                  <Button variant="outline" className="w-full">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </Link>
                
                {profile?.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      LinkedIn Profile
                    </Button>
                  </a>
                )}
                
                {profile?.website_url && (
                  <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full">
                      Personal Website
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Member since:</strong> {new Date(profile?.created_at || '').toLocaleDateString()}</p>
                <p><strong>Last updated:</strong> {new Date(profile?.updated_at || '').toLocaleDateString()}</p>
                <p><strong>Account status:</strong> <span className="text-green-600 font-medium">Active</span></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}