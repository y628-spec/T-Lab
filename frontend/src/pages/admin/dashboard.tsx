import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { Dashboard } from '../../pages/dashboard';
import { AppLayout } from '../../components/layout/AppLayout';

export default function AdminDashboard() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'Administrator')) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <AppLayout><div>Loading...</div></AppLayout>;
  }

  if (!currentUser || currentUser.role !== 'Administrator') {
    return null;
  }

  return <Dashboard />;
}
