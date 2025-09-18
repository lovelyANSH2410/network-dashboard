import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { MemberCard } from "@/components/MemberCard";
import { DirectorySearch } from "@/components/DirectorySearch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { filterOptions } from "@/data/sampleMembers";
import { Users, Building, GraduationCap, Globe } from "lucide-react";

interface MemberData {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  program: string;
  graduation_year: number;
  organization: string;
  organization_type: string;
  position: string;
  experience_level: string;
  location?: string;
  city?: string;
  country?: string;
  linkedin_url?: string;
  website_url?: string;
  bio?: string;
  interests?: string[];
  skills?: string[];
  avatar_url?: string;
}

interface ActiveFilters {
  program?: string;
  orgType?: string;
  graduationYear?: string;
  location?: string;
  experienceLevel?: string;
}

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({});
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from("member_directory")
          .select("*");

        if (error) {
          console.error("Error fetching members:", error);
        } else {
          setMembers(data || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(member => 
        member.first_name?.toLowerCase().includes(query) ||
        member.last_name?.toLowerCase().includes(query) ||
        member.organization?.toLowerCase().includes(query) ||
        member.position?.toLowerCase().includes(query) ||
        member.interests?.some(interest => interest.toLowerCase().includes(query)) ||
        member.city?.toLowerCase().includes(query) ||
        member.country?.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (activeFilters.program) {
      filtered = filtered.filter(member => member.program === activeFilters.program);
    }
    if (activeFilters.orgType) {
      filtered = filtered.filter(member => member.organization_type === activeFilters.orgType);
    }
    if (activeFilters.graduationYear) {
      filtered = filtered.filter(member => member.graduation_year?.toString() === activeFilters.graduationYear);
    }
    if (activeFilters.location) {
      filtered = filtered.filter(member => `${member.city}, ${member.country}` === activeFilters.location);
    }
    if (activeFilters.experienceLevel) {
      filtered = filtered.filter(member => member.experience_level === activeFilters.experienceLevel);
    }

    return filtered;
  }, [searchQuery, activeFilters, members]);

  const stats = useMemo(() => {
    return {
      totalMembers: members.length,
      programs: new Set(members.map(m => m.program).filter(Boolean)).size,
      organizations: new Set(members.map(m => m.organization).filter(Boolean)).size,
      countries: new Set(members.map(m => m.country).filter(Boolean)).size
    };
  }, [members]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-healthcare-surface to-background">
      <Header />
      
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              IIMA Healthcare SIG Alumni Directory
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Connect with fellow alumni shaping the future of healthcare across the globe. 
              Discover expertise, build networks, and collaborate on transformative healthcare initiatives.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-primary/20">
              <CardContent className="pt-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-sm text-muted-foreground">Members</p>
              </CardContent>
            </Card>
            <Card className="border-accent/20">
              <CardContent className="pt-6 text-center">
                <GraduationCap className="h-8 w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.programs}</div>
                <p className="text-sm text-muted-foreground">Programs</p>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardContent className="pt-6 text-center">
                <Building className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.organizations}</div>
                <p className="text-sm text-muted-foreground">Organizations</p>
              </CardContent>
            </Card>
            <Card className="border-accent/20">
              <CardContent className="pt-6 text-center">
                <Globe className="h-8 w-8 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.countries}</div>
                <p className="text-sm text-muted-foreground">Countries</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Member Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DirectorySearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              filterOptions={filterOptions}
              resultsCount={filteredMembers.length}
            />
          </CardContent>
        </Card>

        {/* Members Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-64 bg-muted/50"></CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={{
                  id: member.id,
                  firstName: member.first_name || "",
                  lastName: member.last_name || "",
                  program: member.program || "",
                  graduationYear: member.graduation_year || 0,
                  currentOrg: member.organization || "",
                  orgType: member.organization_type || "",
                  city: member.city || "",
                  country: member.country || "",
                  role: member.position || "",
                  yearsExperience: 0, // Will need to calculate from experience_level
                  linkedin: member.linkedin_url,
                  email: member.email || "",
                  phone: member.phone,
                  phoneVisible: !!member.phone,
                  interests: member.interests || [],
                  profileImageUrl: member.avatar_url || undefined
                }}
                showContactInfo={!!member.email || !!member.phone}
                onViewProfile={(id) => console.log('View profile:', id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No members found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or filters to find more members.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilters({});
                }}
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Call to Action */}
        {!loading && (
          <Card className="mt-12 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-2xl font-bold mb-4">Join the IIMA Healthcare SIG Alumni Network</h3>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Connect with healthcare professionals from IIM Ahmedabad and expand your network 
                in the healthcare industry. Apply to join our exclusive community today.
              </p>
              <Button size="lg">
                Apply to Join SIG
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
