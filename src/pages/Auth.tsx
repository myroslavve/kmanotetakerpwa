import { useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth';
import { useAuthForm } from '../hooks/useAuthForm';

const Auth = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isSignup,
    toggleMode,
    error,
    setErrorMessage,
    isLoading,
    setLoadingState,
  } = useAuthForm();
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoadingState(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Authentication failed',
      );
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800'>
      <div className='bg-slate-950 rounded-lg shadow-lg p-8 w-full max-w-md border border-slate-700'>
        <h1 className='text-3xl font-bold mb-6 text-center text-white'>
          {isSignup ? 'Sign Up' : 'Login'}
        </h1>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-200 mb-1'>
              Email
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className='w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              placeholder='you@example.com'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-200 mb-1'>
              Password
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className='w-full px-4 py-2 border border-slate-600 rounded-lg bg-slate-900 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              placeholder='••••••••'
            />
          </div>

          {error && (
            <div className='text-red-400 text-sm bg-red-950 p-2 rounded border border-red-800'>
              {error}
            </div>
          )}

          <button
            type='submit'
            disabled={isLoading}
            className='w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition'
          >
            {isLoading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
          </button>
        </form>

        <div className='mt-6 text-center'>
          <p className='text-gray-300 text-sm'>
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={toggleMode}
              className='text-indigo-400 font-medium ml-1 hover:text-indigo-300 transition'
            >
              {isSignup ? 'Login' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
