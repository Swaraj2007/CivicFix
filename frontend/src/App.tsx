import { useRouter } from '@/router';
import { Header, Footer } from '@/components/Layout';
import { ToastProvider } from '@/components/Toast';
import { CitizenHome } from '@/pages/citizen/CitizenHome';
import { CitizenReport } from '@/pages/citizen/CitizenReport';
import { CitizenTrack } from '@/pages/citizen/CitizenTrack';
import { CitizenTrackDetail } from '@/pages/citizen/CitizenTrackDetail';
import { CitizenResult } from '@/pages/citizen/CitizenResult';
import { CitizenAiAnalysis } from '@/pages/citizen/CitizenAiAnalysis';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminMap } from '@/pages/admin/AdminMap';
import { AdminTable } from '@/pages/admin/AdminTable';
import { AdminDetail } from '@/pages/admin/AdminDetail';
import { AdminDuplicates } from '@/pages/admin/AdminDuplicates';
import { AdminDuplicateDetail } from '@/pages/admin/AdminDuplicateDetail';
import { AdminSla } from '@/pages/admin/AdminSla';
import { useAuth } from '@/context/AuthContext';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { AdminLogin } from '@/pages/AdminLogin';

function App() {
  const { route, navigate } = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const requireCitizen = (page: React.ReactNode) => {
    if (!user) {
      setTimeout(() => navigate({ name: 'login' }), 0);
      return null;
    }
    if (user.role === 'ADMIN') {
      setTimeout(() => navigate({ name: 'admin-dashboard' }), 0);
      return null;
    }
    return page;
  };

  const requireAdmin = (page: React.ReactNode) => {
    if (!user) {
      setTimeout(() => navigate({ name: 'admin-login' }), 0);
      return null;
    }
    if (user.role !== 'ADMIN') {
      setTimeout(() => navigate({ name: 'citizen-home' }), 0);
      return null;
    }
    return page;
  };

  const requireUnauth = (page: React.ReactNode) => {
    if (user) {
      if (user.role === 'ADMIN') {
        setTimeout(() => navigate({ name: 'admin-dashboard' }), 0);
      } else {
        setTimeout(() => navigate({ name: 'citizen-home' }), 0);
      }
      return null;
    }
    return page;
  };

  let page: React.ReactNode;
  switch (route.name) {
    case 'login': page = requireUnauth(<Login navigate={navigate} />); break;
    case 'signup': page = requireUnauth(<Signup navigate={navigate} />); break;
    case 'admin-login': page = requireUnauth(<AdminLogin navigate={navigate} />); break;
    case 'citizen-home': page = requireCitizen(<CitizenHome navigate={navigate} />); break;
    case 'citizen-report': page = requireCitizen(<CitizenReport navigate={navigate} />); break;
    case 'citizen-track': page = requireCitizen(<CitizenTrack navigate={navigate} />); break;
    case 'citizen-track-detail': page = requireCitizen(<CitizenTrackDetail id={route.id} navigate={navigate} />); break;
    case 'citizen-result': page = requireCitizen(<CitizenResult id={route.id} navigate={navigate} />); break;
    case 'citizen-ai-analysis': page = requireCitizen(<CitizenAiAnalysis id={route.id} navigate={navigate} />); break;
    case 'admin-dashboard': page = requireAdmin(<AdminDashboard navigate={navigate} />); break;
    case 'admin-map': page = requireAdmin(<AdminMap navigate={navigate} />); break;
    case 'admin-table': page = requireAdmin(<AdminTable navigate={navigate} />); break;
    case 'admin-detail': page = requireAdmin(<AdminDetail id={route.id} navigate={navigate} />); break;
    case 'admin-duplicates': page = requireAdmin(<AdminDuplicates navigate={navigate} />); break;
    case 'admin-duplicate-detail': page = requireAdmin(<AdminDuplicateDetail id={route.id} navigate={navigate} />); break;
    case 'admin-sla': page = requireAdmin(<AdminSla navigate={navigate} />); break;
    default: page = requireCitizen(<CitizenHome navigate={navigate} />);
  }

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header route={route} navigate={navigate} />
        <main className="flex-1">{page}</main>
        <Footer />
      </div>
    </ToastProvider>
  );
}

export default App;
