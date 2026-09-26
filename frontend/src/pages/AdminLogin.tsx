import { useState } from 'react';
import { login } from '@/services/auth';
import { useAuth } from '@/context/AuthContext';
import { Route } from '@/router';
import { Eye, EyeOff } from 'lucide-react';

export function AdminLogin({ navigate }: { navigate: (r: Route) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login: setAuth } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token, user } = await login(email, password);
      if (user.role !== 'ADMIN') {
        throw new Error("Access denied. Admins only.");
      }
      setAuth(token, user);
      navigate({ name: 'admin-dashboard' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Admin Portal Login</h2>
        
        {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm mb-4 border border-red-100">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 pr-10"
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
            className="w-full bg-slate-800 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-900 transition-colors mt-2"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-slate-500">
          <button onClick={() => navigate({ name: 'login' })} className="text-blue-600 font-semibold hover:underline">Return to Citizen Login</button>
        </div>
      </div>
    </div>
  );
}
