import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth';
import { useNotes } from '../hooks/useNotes';

const Home = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const { notes, isLoading, error, fetchNotes, createNewNote } =
    useNotes(token);

  useEffect(() => {
    if (token) {
      fetchNotes();
    }
  }, [token, fetchNotes]);

  const handleCreateNote = async () => {
    try {
      const note = await createNewNote();
      navigate(`/note/${note.id}`);
    } catch {
      // Error handling is done by the hook
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <h1 className='text-4xl font-bold mb-4'>Welcome to NoteTaker PWA</h1>
          <p className='text-gray-600 !mb-8'>Please log in to continue</p>
          <button
            onClick={() => navigate('/auth')}
            className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition'
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex justify-between items-center mb-8'>
          <div>
            <h1 className='text-4xl font-bold text-gray-800'>My Notes</h1>
            <p className='text-gray-600 mt-1'>Logged in as: {user.email}</p>
          </div>
          <div className='space-x-3'>
            <button
              onClick={handleCreateNote}
              className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition'
            >
              New Note
            </button>
            <button
              onClick={handleLogout}
              className='bg-gray-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600 transition'
            >
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className='text-red-600 bg-red-50 p-4 rounded-lg mb-4'>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className='text-center py-12'>
            <p className='text-gray-600'>Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md p-12 text-center'>
            <p className='text-gray-600 mb-4'>No notes yet</p>
            <button
              onClick={handleCreateNote}
              className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition'
            >
              Create Your First Note
            </button>
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/note/${note.id}`)}
                className='w-full bg-white rounded-lg shadow-md px-6 py-4 cursor-pointer hover:shadow-lg transition-all'
              >
                <div className='flex items-center justify-between gap-4'>
                  <h2 className='text-xl font-bold text-gray-800 truncate'>
                    {note.title || 'Untitled'}
                  </h2>
                  <p className='text-sm text-gray-500 whitespace-nowrap'>
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
