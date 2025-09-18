import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Header from '@/components/Header';

export default function Registration() {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    city: '',
    country: '',
    organization: '',
    position: '',
    program: '',
    experience_level: '',
    organization_type: '',
    graduation_year: '',
    bio: '',
    skills: '',
    interests: '',
    linkedin_url: '',
    website_url: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (user?.email && !emailPattern.test(user.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Indian mobile number validation (+91 followed by 10 digits)
    const phonePattern = /^(\+91|91)?[6-9]\d{9}$/;
    if (formData.phone && !phonePattern.test(formData.phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Please enter a valid Indian mobile number (+91XXXXXXXXXX)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const skillsArray = formData.skills.split(',').map(s => s.trim()).filter(s => s);
      const interestsArray = formData.interests.split(',').map(s => s.trim()).filter(s => s);

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.date_of_birth || null,
          city: formData.city,
          country: formData.country,
          organization: formData.organization,
          position: formData.position,
          program: formData.program,
          experience_level: formData.experience_level as any,
          organization_type: formData.organization_type as any,
          graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
          bio: formData.bio,
          skills: skillsArray,
          interests: interestsArray,
          linkedin_url: formData.linkedin_url,
          website_url: formData.website_url,
          approval_status: 'pending'
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      await refreshUserData();
      
      toast({
        title: "Registration Submitted",
        description: "Your profile has been submitted for admin approval. You'll be notified once it's reviewed.",
      });
      
      navigate('/waiting-approval');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Registration</CardTitle>
              <CardDescription>
                Please fill in your complete profile details. Your registration will be reviewed by an administrator.
              </CardDescription>
            </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number * (Indian Mobile)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91XXXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && (
                      <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                    />
                  </div>
                </div>
              </div>


              {/* Professional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({...formData, organization: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <Select onValueChange={(value) => setFormData({...formData, experience_level: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
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
                    <Label htmlFor="organization_type">Organization Type</Label>
                    <Select onValueChange={(value) => setFormData({...formData, organization_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select organization type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corporate">Corporate</SelectItem>
                        <SelectItem value="Startup">Startup</SelectItem>
                        <SelectItem value="Non-Profit">Non-Profit</SelectItem>
                        <SelectItem value="Government">Government</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Technology">Technology</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="program">Program/Course</Label>
                    <Input
                      id="program"
                      value={formData.program}
                      onChange={(e) => setFormData({...formData, program: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="graduation_year">Graduation Year</Label>
                    <Input
                      id="graduation_year"
                      type="number"
                      min="1950"
                      max="2030"
                      value={formData.graduation_year}
                      onChange={(e) => setFormData({...formData, graduation_year: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={formData.skills}
                      onChange={(e) => setFormData({...formData, skills: e.target.value})}
                      placeholder="JavaScript, React, Python..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                    <Input
                      id="interests"
                      value={formData.interests}
                      onChange={(e) => setFormData({...formData, interests: e.target.value})}
                      placeholder="Technology, Travel, Sports..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                      placeholder="https://linkedin.com/in/yourprofile"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website_url">Website URL</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Registration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}