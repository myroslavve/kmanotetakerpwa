import { Navigate } from 'react-router';
import { useAuth } from '../context/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/auth' replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
