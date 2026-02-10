import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { deviceService } from '@/services/deviceService';
import { toast } from 'sonner';

export const PairDevice: React.FC = () => {
  const [pairingCode, setPairingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pairingCode.trim()) {
      toast.error('Please enter a pairing code');
      return;
    }

    if (!user) {
      toast.error('You must be signed in to pair a device');
      return;
    }

    setLoading(true);
    try {
      const result = await deviceService.pairDevice(pairingCode.trim(), user.uid);
      
      if ('error' in result) {
        toast.error(result.error);
      } else {
        setSuccess(true);
        toast.success('Device paired successfully!');
        setTimeout(() => navigate(`/device/${result.deviceId}`), 1500);
      }
    } catch (error) {
      toast.error('Failed to pair device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {success ? (
                  <CheckCircle className="h-8 w-8 text-primary" />
                ) : (
                  <Link2 className="h-8 w-8 text-primary" />
                )}
              </div>
              <CardTitle>{success ? 'Device Paired!' : 'Pair a Device'}</CardTitle>
              <CardDescription>
                {success
                  ? 'Redirecting to device details...'
                  : 'Enter the pairing code shown on your child\'s device'}
              </CardDescription>
            </CardHeader>
            {!success && (
              <CardContent>
                <form onSubmit={handlePair} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pairing-code">Pairing Code</Label>
                    <Input
                      id="pairing-code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={pairingCode}
                      onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                      className="text-center text-2xl tracking-widest"
                      maxLength={10}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Pairing...' : 'Pair Device'}
                  </Button>
                </form>

                <div className="mt-6 rounded-lg bg-muted p-4">
                  <h4 className="mb-2 font-medium">How to get the pairing code:</h4>
                  <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                    <li>Open KidGuard on your child's Android device</li>
                    <li>Tap "Get Pairing Code"</li>
                    <li>Enter the code shown above</li>
                  </ol>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PairDevice;
