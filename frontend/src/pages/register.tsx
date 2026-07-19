import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '../components/auth/AuthShell';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { requestRegistrationOtp, verifyRegistrationOtp, registerUser } from '../lib/auth';
import { Role } from '../types';

const roles: Array<Exclude<Role, 'Administrator'>> = ['Project Manager', 'Team Member'];
const passwordChecks = [
  { label: 'Minimum 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'Uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'Lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'Number', test: (value: string) => /\d/.test(value) },
  { label: 'Special character', test: (value: string) => /[^A-Za-z\d]/.test(value) },
];

function getPasswordStrength(value: string) {
  const score = passwordChecks.filter(({ test }) => test(value)).length;
  if (!value) return { label: '', score: 0 };
  if (score <= 1) return { label: 'Weak', score };
  if (score <= 2) return { label: 'Fair', score };
  if (score <= 3) return { label: 'Good', score };
  if (score <= 4) return { label: 'Strong', score };
  return { label: 'Very Strong', score };
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [role, setRole] = useState<Exclude<Role, 'Administrator'>>('Project Manager');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = passwordConfirmation.length > 0 && password === passwordConfirmation;

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestRegistrationOtp({ name, email, password, password_confirmation: passwordConfirmation, role });
      toast.success('OTP sent to your email.');
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP.');
      toast.error(err instanceof Error ? err.message : 'Unable to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verifyRegistrationOtp({ email, code, type: 'registration' });
      await registerUser({ name, email, password, password_confirmation: passwordConfirmation, role });
      toast.success('Account created successfully.');
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP.');
      toast.error(err instanceof Error ? err.message : 'Unable to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Register as a Project Manager or Team Member"
      footer={
        <p className="text-sm text-secondary text-center">
          Already have an account?{' '}
          <button onClick={() => router.push('/login')} className="text-accent font-medium hover:underline">Sign in</button>
        </p>
      }
    >
      {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500 mb-4">{error}</div> : null}

      {step === 'form' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

          <div className="relative">
            <Input label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-9 text-secondary">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="rounded-xl border border-line p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>Password strength</span>
              <span className="font-medium text-maintext">{strength.label || 'Enter a password'}</span>
            </div>
            <div className="h-2 rounded-full bg-bg overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(strength.score / 5) * 100}%` }} />
            </div>
            <ul className="space-y-1 text-xs text-secondary">
              {passwordChecks.map((check) => {
                const passed = check.test(password);
                return <li key={check.label} className={passed ? 'text-emerald-500' : 'text-secondary'}>{passed ? '✓' : '•'} {check.label}</li>;
              })}
            </ul>
          </div>

          <Input label="Confirm password" type={showPassword ? 'text' : 'password'} value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} autoComplete="new-password" required />
          {passwordConfirmation ? <p className={`text-xs ${passwordsMatch ? 'text-emerald-500' : 'text-red-500'}`}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</p> : null}

          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value as Exclude<Role, 'Administrator'>)}>
            {roles.map((value) => <option key={value} value={value}>{value}</option>)}
          </Select>

          <Button type="submit" className="w-full" size="lg" disabled={loading || strength.score < 5 || !passwordsMatch}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP</> : 'Continue'}
          </Button>
        </form>
      ) : null}

      {step === 'otp' ? (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <Input label="Verification code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying</> : 'Verify & create account'}
          </Button>
          <button type="button" className="text-sm text-accent" onClick={() => setStep('form')}>Back</button>
        </form>
      ) : null}
    </AuthShell>
  );
}
