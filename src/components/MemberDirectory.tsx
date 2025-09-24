import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Mail, Phone, MapPin, Building, Calendar, Linkedin, Globe, MoreVertical, Plus, X, Eye, Lock } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface DirectoryItem {
  profiles: Profile;
  member_id: string;
}

export default function MemberDirectory() {
  const [allMembers, setAllMembers] = useState<Profile[]>([]);
  const [directoryMembers, setDirectoryMembers] = useState<DirectoryItem[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [organizationTypeFilter, setOrganizationTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [userDirectoryIds, setUserDirectoryIds] = useState<Set<string>>(new Set());
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  const fetchAllMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('approval_status', 'approved')
        .eq('is_public', true)
        .order('first_name');

      if (error) throw error;
      
      setAllMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch members directory",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDirectoryMembers = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch(`https://ndytoqziowlraazwokgt.supabase.co/functions/v1/directory-get`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      const directoryData = result.data || [];
      setDirectoryMembers(directoryData);
      
      // Update userDirectoryIds for quick lookup
      const ids = new Set<string>();
      directoryData.forEach((item: { member_id?: string }) => {
        if (item.member_id) {
          ids.add(item.member_id);
        }
      });
      setUserDirectoryIds(ids);
      
    } catch (error) {
      console.error('Error fetching directory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your directory",
        variant: "destructive",
      });
    } finally {
      setDirectoryLoading(false);
    }
  }, [user, toast]);

  const addToDirectory = async (memberId: string) => {
    if (!user) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('No access token');
      }

      const response = await supabase.functions.invoke('directory-add', {
        body: { member_id: memberId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) throw response.error;

      // Update local state
      setUserDirectoryIds(prev => new Set([...prev, memberId]));
      
      toast({
        title: "Success",
        description: "Member added to your directory",
      });
      
      // Refresh directory
      fetchDirectoryMembers();
      
    } catch (error) {
      console.error('Error adding to directory:', error);
      toast({
        title: "Error",
        description: "Failed to add member to directory",
        variant: "destructive",
      });
    }
  };

  const removeFromDirectory = async (memberId: string) => {
    if (!user) return;
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('No access token');
      }

      const response = await fetch(`https://ndytoqziowlraazwokgt.supabase.co/functions/v1/directory-remove/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      if (!result.success && result.error) throw new Error(result.error);

      // Update local state
      setUserDirectoryIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
      
      toast({
        title: "Success",
        description: "Member removed from your directory",
      });
      
      // Refresh directory
      fetchDirectoryMembers();
      
    } catch (error) {
      console.error('Error removing from directory:', error);
      toast({
        title: "Error",
        description: "Failed to remove member from directory",
        variant: "destructive",
      });
    }
  };

  const filterMembers = useCallback(() => {
    const baseMembers = activeTab === 'directory' 
      ? directoryMembers.map(item => item.profiles).filter(Boolean)
      : allMembers;
    
    let filtered = baseMembers;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(member => {
        // Basic information
        const nameMatch = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase().includes(searchLower);
        const organizationMatch = member.organization?.toLowerCase().includes(searchLower) || false;
        const positionMatch = member.position?.toLowerCase().includes(searchLower) || false;
        const programMatch = member.program?.toLowerCase().includes(searchLower) || false;
        
        // Location information
        const cityMatch = member.city?.toLowerCase().includes(searchLower) || false;
        const countryMatch = member.country?.toLowerCase().includes(searchLower) || false;
        const addressMatch = member.address?.toLowerCase().includes(searchLower) || false;
        
        // Professional details
        const experienceMatch = member.experience_level?.toLowerCase().includes(searchLower) || false;
        const orgTypeMatch = member.organization_type?.toLowerCase().includes(searchLower) || false;
        const graduationYearMatch = member.graduation_year?.toString().includes(searchLower) || false;
        
        // Bio and description
        const bioMatch = member.bio?.toLowerCase().includes(searchLower) || false;
        
        // Skills array search
        const skillsMatch = member.skills?.some(skill => 
          skill.toLowerCase().includes(searchLower)
        ) || false;
        
        // Interests array search
        const interestsMatch = member.interests?.some(interest => 
          interest.toLowerCase().includes(searchLower)
        ) || false;
        
        // Social links
        const linkedinMatch = member.linkedin_url?.toLowerCase().includes(searchLower) || false;
        const websiteMatch = member.website_url?.toLowerCase().includes(searchLower) || false;
        
        // Contact information (if visible)
        const emailMatch = member.show_contact_info && member.email?.toLowerCase().includes(searchLower) || false;
        const phoneMatch = member.show_contact_info && member.phone?.toLowerCase().includes(searchLower) || false;
        
        return nameMatch || organizationMatch || positionMatch || programMatch || 
               cityMatch || countryMatch || addressMatch || experienceMatch || 
               orgTypeMatch || graduationYearMatch || bioMatch || skillsMatch || 
               interestsMatch || linkedinMatch || websiteMatch || emailMatch || phoneMatch;
      });
    }

    if (experienceFilter && experienceFilter !== 'all') {
      filtered = filtered.filter(member => member.experience_level === experienceFilter);
    }

    if (organizationTypeFilter && organizationTypeFilter !== 'all' && organizationTypeFilter !== 'All organization types') {
      filtered = filtered.filter(member => member.organization_type === organizationTypeFilter);
    }

    setFilteredMembers(filtered);
  }, [activeTab, directoryMembers, allMembers, searchTerm, experienceFilter, organizationTypeFilter]);

  useEffect(() => {
    fetchAllMembers();
    if (user) {
      fetchDirectoryMembers();
    }
  }, [fetchAllMembers, fetchDirectoryMembers, user]);

  useEffect(() => {
    filterMembers();
  }, [filterMembers]);

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const renderMemberDetails = (member: Profile) => {
    const canViewContactInfo = member.show_contact_info;
    const canViewLocation = member.show_location;

    return (
      <div className="space-y-6">
        {/* Personal Information */}
        <div>
          <h4 className="font-semibold mb-2">Personal Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Name:</strong> {member.first_name} {member.last_name}</div>
            {canViewContactInfo && member.email ? (
              <div><strong>Email:</strong> <a href={`mailto:${member.email}`} className="text-blue-600 hover:underline">{member.email}</a></div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Email hidden</span>
              </div>
            )}
            {canViewContactInfo && member.phone ? (
              <div><strong>Phone:</strong> <a href={`tel:${member.phone}`} className="text-blue-600 hover:underline">{member.phone}</a></div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Phone hidden</span>
              </div>
            )}
            {member.date_of_birth && (
              <div><strong>Date of Birth:</strong> {member.date_of_birth}</div>
            )}
            {canViewLocation && member.address && (
              <div className="col-span-2"><strong>Address:</strong> {member.address}</div>
            )}
            {canViewLocation && member.city && (
              <div><strong>City:</strong> {member.city}</div>
            )}
            {canViewLocation && member.country && (
              <div><strong>Country:</strong> {member.country}</div>
            )}
            {!canViewLocation && (
              <div className="col-span-2 flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Location information hidden</span>
              </div>
            )}
          </div>
        </div>

        {/* Professional Information */}
        <div>
          <h4 className="font-semibold mb-2">Professional Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {member.organization && (
              <div><strong>Organization:</strong> {member.organization}</div>
            )}
            {member.position && (
              <div><strong>Position:</strong> {member.position}</div>
            )}
            {member.experience_level && (
              <div><strong>Experience:</strong> {member.experience_level}</div>
            )}
            {member.organization_type && (
              <div><strong>Org Type:</strong> {member.organization_type}</div>
            )}
            {member.program && (
              <div><strong>Program:</strong> {member.program}</div>
            )}
            {member.graduation_year && (
              <div><strong>Graduation Year:</strong> {member.graduation_year}</div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <h4 className="font-semibold mb-2">Additional Information</h4>
          <div className="space-y-2 text-sm">
            {member.bio && (
              <div><strong>Bio:</strong> {member.bio}</div>
            )}
            {member.skills && member.skills.length > 0 && (
              <div>
                <strong>Skills:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {member.interests && member.interests.length > 0 && (
              <div>
                <strong>Interests:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {canViewContactInfo && member.linkedin_url && (
              <div><strong>LinkedIn:</strong> <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{member.linkedin_url}</a></div>
            )}
            {member.website_url && (
              <div><strong>Website:</strong> <a href={member.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{member.website_url}</a></div>
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        {(!canViewContactInfo || !canViewLocation) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Privacy Notice</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              This member has chosen to keep some information private. Contact information and location details may be hidden.
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading || (activeTab === 'directory' && directoryLoading)) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="directory">My Directory</TabsTrigger>
          <TabsTrigger value="all">All Members</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {/* Search and Filters */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Members
          </CardTitle>
          <CardDescription>
            Find alumni by name, organization, skills, bio, interests, or any other profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, organization, skills, bio, interests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All experience levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All experience levels</SelectItem>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Recent Graduate">Recent Graduate</SelectItem>
                  <SelectItem value="Entry Level">Entry Level</SelectItem>
                  <SelectItem value="Mid Level">Mid Level</SelectItem>
                  <SelectItem value="Senior Level">Senior Level</SelectItem>
                  <SelectItem value="Executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="orgType">Organization Type</Label>
              <Select value={organizationTypeFilter} onValueChange={setOrganizationTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All organization types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All organization types</SelectItem>
                  <SelectItem value="Hospital/Clinic">Hospital/Clinic</SelectItem>
                  <SelectItem value="HealthTech">HealthTech</SelectItem>
                  <SelectItem value="Pharmaceutical">Pharmaceutical</SelectItem>
                  <SelectItem value="Biotech">Biotech</SelectItem>
                  <SelectItem value="Medical Devices">Medical Devices</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Public Health/Policy">Public Health/Policy</SelectItem>
                  <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                  <SelectItem value="Academic/Research">Academic/Research</SelectItem>
                  <SelectItem value="Startup">Startup</SelectItem>
                  <SelectItem value="VC">VC</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Results Count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Showing {filteredMembers.length} of {allMembers.length} members</span>
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md h-[420px] flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Header with Badge */}
                  <div className="relative p-6 pb-4">
                    {userDirectoryIds.has(member.user_id) && (
                      <Badge 
                        variant="secondary" 
                        className="absolute top-4 right-4 text-xs bg-green-100 text-green-700 border-green-300"
                      >
                        In Directory
                      </Badge>
                    )}
                    
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 ring-2 ring-primary/10 flex-shrink-0">
                        <AvatarImage src={member.avatar_url || ''} alt={`${member.first_name} ${member.last_name}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate text-foreground leading-tight">
                          {member.first_name} {member.last_name}
                        </h3>
                        
                        {member.position && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {member.position}
                          </p>
                        )}
                        
                        {member.organization && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">
                              {member.organization}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Section - Fixed height with scroll if needed */}
                  <div className="px-6 pb-4 space-y-2 flex-1 overflow-hidden">
                    <div className="space-y-2">
                      {(member.city || member.country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {member.city}{member.city && member.country && ', '}{member.country}
                          </p>
                        </div>
                      )}

                      {member.program && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {member.program}
                            {member.graduation_year && ` (${member.graduation_year})`}
                          </p>
                        </div>
                      )}

                      {/* Contact Info (only if member allows it) */}
                      {member.show_contact_info && (
                        <div className="space-y-1">
                          {member.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a href={`mailto:${member.email}`} className="text-xs text-blue-600 hover:underline truncate">
                                {member.email}
                              </a>
                            </div>
                          )}
                          
                          {member.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a href={`tel:${member.phone}`} className="text-xs text-blue-600 hover:underline">
                                {member.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Social Links */}
                      <div className="flex gap-2 pt-1">
                        {member.linkedin_url && (
                          <a 
                            href={member.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        
                        {member.website_url && (
                          <a 
                            href={member.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded hover:bg-gray-50"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {member.experience_level && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            {member.experience_level}
                          </Badge>
                        )}
                        
                        {member.organization_type && (
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {member.organization_type}
                          </Badge>
                        )}
                      </div>

                      {/* Skills Preview */}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {member.skills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                              {skill}
                            </Badge>
                          ))}
                          {member.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              +{member.skills.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Fixed at bottom */}
                  <div className="px-6 pb-6 pt-4 border-t bg-muted/20 mt-auto">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsDetailsDialogOpen(true);
                        }}
                        className="flex-1 h-9 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0 hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!userDirectoryIds.has(member.user_id) ? (
                            <DropdownMenuItem
                              onClick={() => addToDirectory(member.user_id)}
                              className="text-sm"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Directory
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => removeFromDirectory(member.user_id)}
                              className="text-destructive text-sm"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove from Directory
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          

          {filteredMembers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No members found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or filters to see more results.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="directory" className="space-y-6">
          {/* Search and Filters for Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search My Directory
              </CardTitle>
              <CardDescription>
                Find members in your personal directory by name, organization, skills, bio, interests, or any other profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search-directory">Search</Label>
                  <Input
                    id="search-directory"
                    placeholder="Search by name, organization, skills, bio, interests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="experience-directory">Experience Level</Label>
                  <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All experience levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All experience levels</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Recent Graduate">Recent Graduate</SelectItem>
                      <SelectItem value="Entry Level">Entry Level</SelectItem>
                      <SelectItem value="Mid Level">Mid Level</SelectItem>
                      <SelectItem value="Senior Level">Senior Level</SelectItem>
                      <SelectItem value="Executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="orgType-directory">Organization Type</Label>
                  <Select value={organizationTypeFilter} onValueChange={setOrganizationTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All organization types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All organization types</SelectItem>
                      <SelectItem value="Hospital/Clinic">Hospital/Clinic</SelectItem>
                      <SelectItem value="HealthTech">HealthTech</SelectItem>
                      <SelectItem value="Pharmaceutical">Pharmaceutical</SelectItem>
                      <SelectItem value="Biotech">Biotech</SelectItem>
                      <SelectItem value="Medical Devices">Medical Devices</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Public Health/Policy">Public Health/Policy</SelectItem>
                      <SelectItem value="Health Insurance">Health Insurance</SelectItem>
                      <SelectItem value="Academic/Research">Academic/Research</SelectItem>
                      <SelectItem value="Startup">Startup</SelectItem>
                      <SelectItem value="VC">VC</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Count for Directory */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Showing {filteredMembers.length} of {directoryMembers.length} directory members</span>
          </div>

          {/* Directory Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-lg transition-all duration-200 border-0 shadow-md h-[420px] flex flex-col">
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Header */}
                  <div className="relative p-6 pb-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="w-14 h-14 ring-2 ring-primary/10 flex-shrink-0">
                        <AvatarImage src={member.avatar_url || ''} alt={`${member.first_name} ${member.last_name}`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate text-foreground leading-tight">
                          {member.first_name} {member.last_name}
                        </h3>
                        
                        {member.position && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {member.position}
                          </p>
                        )}
                        
                        {member.organization && (
                          <div className="flex items-center gap-1 mt-1">
                            <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <p className="text-xs text-muted-foreground truncate">
                              {member.organization}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Section - Fixed height with scroll if needed */}
                  <div className="px-6 pb-4 space-y-2 flex-1 overflow-hidden">
                    <div className="space-y-2">
                      {(member.city || member.country) && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {member.city}{member.city && member.country && ', '}{member.country}
                          </p>
                        </div>
                      )}

                      {member.program && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">
                            {member.program}
                            {member.graduation_year && ` (${member.graduation_year})`}
                          </p>
                        </div>
                      )}

                      {/* Contact Info (only if member allows it) */}
                      {member.show_contact_info && (
                        <div className="space-y-1">
                          {member.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a href={`mailto:${member.email}`} className="text-xs text-blue-600 hover:underline truncate">
                                {member.email}
                              </a>
                            </div>
                          )}
                          
                          {member.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a href={`tel:${member.phone}`} className="text-xs text-blue-600 hover:underline">
                                {member.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Social Links */}
                      <div className="flex gap-2 pt-1">
                        {member.linkedin_url && (
                          <a 
                            href={member.linkedin_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-50"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        )}
                        
                        {member.website_url && (
                          <a 
                            href={member.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded hover:bg-gray-50"
                          >
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {member.experience_level && (
                          <Badge variant="secondary" className="text-xs px-2 py-1">
                            {member.experience_level}
                          </Badge>
                        )}
                        
                        {member.organization_type && (
                          <Badge variant="outline" className="text-xs px-2 py-1">
                            {member.organization_type}
                          </Badge>
                        )}
                      </div>

                      {/* Skills Preview */}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {member.skills.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-1">
                              {skill}
                            </Badge>
                          ))}
                          {member.skills.length > 2 && (
                            <Badge variant="outline" className="text-xs px-2 py-1">
                              +{member.skills.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Fixed at bottom */}
                  <div className="px-6 pb-6 pt-4 border-t bg-muted/20 mt-auto">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedMember(member);
                          setIsDetailsDialogOpen(true);
                        }}
                        className="flex-1 h-9 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0 hover:bg-muted">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => removeFromDirectory(member.user_id)}
                            className="text-destructive text-sm"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Remove from Directory
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          

          {filteredMembers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No directory members found</h3>
                <p className="text-muted-foreground">
                  {directoryMembers.length === 0 
                    ? "You haven't added any members to your directory yet. Go to 'All Members' to add some."
                    : "Try adjusting your search criteria or filters to see more results."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Member Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedMember ? `${selectedMember.first_name} ${selectedMember.last_name}` : 'Member Details'}
            </DialogTitle>
            <DialogDescription>
              Complete profile information
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && renderMemberDetails(selectedMember)}
        </DialogContent>
      </Dialog>
    </div>
  );
}