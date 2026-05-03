import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success('Password reset link sent to your email!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            className="w-fit -ml-2 mb-2"
            onClick={() => navigate('/login')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            {submitted
              ? "We've sent you a password reset link"
              : 'Enter your email to reset your password'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center py-6">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Mail className="h-8 w-8 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">Check your email</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  We sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email?{' '}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setSubmitted(false)}
                  >
                    Try again
                  </button>
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/login')}>
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send Reset Link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
