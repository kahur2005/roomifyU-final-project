import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '../utils/auth';
import { ThemeToggle } from '../components/ThemeToggle';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'lecturer' | 'admin'>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectToRoleDashboard = (role: 'student' | 'lecturer' | 'admin') => {
    if (role === 'admin') {
      navigate('/app/admin', { replace: true });
      return;
    }
    navigate('/app/dashboard', { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await authService.login({ email, password, role });

      if (user) {
        toast.success(`Welcome ${user.name}!`);
        redirectToRoleDashboard(user.role);
      } else {
        setError('Invalid email or password');
        toast.error('Login failed', {
          description: 'Invalid email or password',
        });
      }
    } catch {
      setError('An error occurred during login');
      toast.error('Login error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle variant="outline" />
      </div>
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Illustration */}
        <div className="hidden md:flex flex-col items-center justify-center p-8">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-primary mb-2">RoomifyU</h1>
            <p className="text-xl text-muted-foreground">Sampoerna University Room Booking System</p>
          </div>
          <img
            src="https://res.cloudinary.com/dcmdkdwlw/image/upload/q_auto/f_auto/v1777399374/login_building_dnkzmg.jpg"
            alt="University Campus"
            className="rounded-2xl shadow-2xl max-w-md w-full"
          />
        </div>

        {/* Right side - Login Form */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Welcome back!</CardTitle>
              <CardDescription>
                Sign in to your account to manage room bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4 rounded-lg border bg-muted/30 p-4">
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 border-border bg-background shadow-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      className="px-0 h-auto"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="*********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-border bg-background shadow-sm"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as typeof role)} disabled={isLoading}>
                    <SelectTrigger id="role" className="h-11 border-border bg-background shadow-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="lecturer">Lecturer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Don't have an account?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 h-auto text-xs"
                    onClick={() => navigate('/register')}
                  >
                    Sign up
                  </Button>
                </p>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Need help?{' '}
                <a href="https://wa.me/6281770880171" className="text-primary hover:underline">
                  Contact IT Support
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
