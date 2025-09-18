import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type UserRole = 'admin' | 'normal_user';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface AuthUser extends User {
  role?: UserRole;
  profile?: Tables<'profiles'>;
  approvalStatus?: ApprovalStatus;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    return { role: roleData?.role, profile: profileData };
  };

  const refreshUserData = async () => {
    if (!session?.user) return;
    
    const { role, profile } = await fetchUserRole(session.user.id);
    setUser({
      ...session.user,
      role: role as UserRole,
      profile,
      approvalStatus: profile?.approval_status as ApprovalStatus
    });
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          const { role, profile } = await fetchUserRole(session.user.id);
          setUser({
            ...session.user,
            role: role as UserRole,
            profile,
            approvalStatus: profile?.approval_status as ApprovalStatus
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserRole(session.user.id).then(({ role, profile }) => {
          setUser({
            ...session.user,
            role: role as UserRole,
            profile,
            approvalStatus: profile?.approval_status as ApprovalStatus
          });
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = user?.role === 'admin';
  const isApproved = user?.approvalStatus === 'approved';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin,
      isApproved,
      signIn,
      signUp,
      signOut,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}