import { useState } from 'react';
import { login } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { Route } from '@/router';
import { Eye, EyeOff } from 'lucide-react';

export function Login({ navigate }: { navigate: (r: Route) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login: setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      if (user.role === 'ADMIN') {
        navigate({ name: 'admin-dashboard' });
      } else {
        navigate({ name: 'citizen-home' });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Citizen Login</h2>
        
        {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account? <button onClick={() => navigate({ name: 'signup' })} className="text-blue-600 font-semibold hover:underline">Sign up</button>
        </div>
        <div className="mt-2 text-center text-sm text-slate-500">
          Admin? <button onClick={() => navigate({ name: 'admin-login' })} className="text-slate-600 font-semibold hover:underline">Admin Login</button>
        </div>
      </div>
    </div>
  );
}
