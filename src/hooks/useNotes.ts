import { useState, useCallback } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useNotes = (token: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotes = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch('https://localhost:4000/api/notes', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await res.json();
      setNotes(data.notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const createNewNote = useCallback(async () => {
    if (!token) throw new Error('Not authenticated');

    try {
      const res = await fetch('https://localhost:4000/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Untitled',
          content: '',
          reminderAt: null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create note');
      }

      const data = await res.json();
      return data.note;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create note');
    }
  }, [token]);

  return {
    notes,
    isLoading,
    error,
    fetchNotes,
    createNewNote,
  };
};
