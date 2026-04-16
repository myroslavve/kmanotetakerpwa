import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuth } from '../context/useAuth';
import { useNote } from '../hooks/useNote';
import Content from '../components/Content';
import Title from '../components/Title';

function toLocalDateTimeInputValue(isoDate: string | null | undefined) {
  if (!isoDate) {
    return '';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const Note = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const {
    note,
    isLoading,
    error,
    isSaving,
    hasPendingSync,
    fetchNote,
    updateTitle,
    updateContent,
    updateReminderAt,
    deleteNote,
  } = useNote(id, token);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    const success = await deleteNote();
    if (success) {
      navigate('/');
    }
  };

  if (!token) {
    return (
      <div className='flex items-center justify-center min-h-screen text-center'>
        <div>
          <h1 className='text-4xl font-bold mb-4'>404 - Not Found</h1>
          <button
            onClick={() => navigate('/auth')}
            className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700'
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Loading note...
      </div>
    );
  }

  if (!note) {
    return (
      <div className='flex items-center justify-center min-h-screen text-center'>
        <div>
          <h1 className='text-4xl font-bold mb-4'>404 - Note Not Found</h1>
          <button
            onClick={() => navigate('/')}
            className='bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700'
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='w-full'>
        {error && (
          <div className='text-red-600 bg-red-50 p-4 mb-4 mx-6 rounded-lg'>
            {error}
          </div>
        )}

        <div className='bg-white shadow-lg px-6 py-6 text-slate-900'>
          <div className='flex justify-between items-center mb-3'>
            <button
              onClick={() => navigate('/')}
              className='text-indigo-600 hover:text-indigo-700 font-medium'
            >
              ← Back to Notes
            </button>
            <div className='flex items-center gap-3'>
              {isSaving && (
                <span className='text-gray-500 text-sm'>Saving...</span>
              )}
              {!isSaving && hasPendingSync && (
                <span className='text-amber-600 text-sm'>Offline, sync pending</span>
              )}
              <button
                onClick={handleDelete}
                className='bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition'
              >
                Delete
              </button>
            </div>
          </div>
          <Title title={note.title} onChange={updateTitle} />
          <div className='mb-4 flex items-center gap-3'>
            <label
              htmlFor='reminderAt'
              className='text-sm font-medium text-slate-700'
            >
              Reminder
            </label>
            <input
              id='reminderAt'
              type='datetime-local'
              value={toLocalDateTimeInputValue(note.reminderAt)}
              onChange={(e) => {
                const nextValue = e.target.value;
                updateReminderAt(
                  nextValue ? new Date(nextValue).toISOString() : null,
                );
              }}
              className='rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-500'
            />
            {note.reminderAt && (
              <button
                type='button'
                onClick={() => updateReminderAt(null)}
                className='text-sm text-slate-600 hover:text-slate-800'
              >
                Clear
              </button>
            )}
          </div>
          <Content content={note.content} onChange={updateContent} />
        </div>
      </div>
    </div>
  );
};

export default Note;
