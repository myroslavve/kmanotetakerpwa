import { useNavigate } from 'react-router';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='text-center'>
        <h1 className='text-5xl font-bold text-gray-800 mb-4'>404</h1>
        <p className='text-gray-600 mb-8 text-lg'>Page not found</p>
        <button
          onClick={() => navigate('/')}
          className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700'
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
