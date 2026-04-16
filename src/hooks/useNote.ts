import { useState, useRef, useCallback, useEffect } from 'react';

interface NoteData {
  id: string;
  title: string;
  content: string;
  reminderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PendingNoteUpdate {
  title: string;
  content: string;
  reminderAt: string | null;
  updatedAt: string;
}

const NOTE_CACHE_KEY = 'note-cache-v1';
const NOTE_PENDING_UPDATES_KEY = 'note-pending-updates-v1';
const NOTE_REMINDER_FIRED_KEY = 'note-reminder-fired-v1';

function readJsonRecord<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, T>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeJsonRecord<T>(key: string, value: Record<string, T>) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCachedNote(noteId: string): NoteData | null {
  const cache = readJsonRecord<NoteData>(NOTE_CACHE_KEY);
  return cache[noteId] ?? null;
}

function setCachedNote(note: NoteData) {
  const cache = readJsonRecord<NoteData>(NOTE_CACHE_KEY);
  cache[note.id] = note;
  writeJsonRecord(NOTE_CACHE_KEY, cache);
}

function getPendingUpdate(noteId: string): PendingNoteUpdate | null {
  const pending = readJsonRecord<PendingNoteUpdate>(NOTE_PENDING_UPDATES_KEY);
  return pending[noteId] ?? null;
}

function setPendingUpdate(noteId: string, update: PendingNoteUpdate) {
  const pending = readJsonRecord<PendingNoteUpdate>(NOTE_PENDING_UPDATES_KEY);
  pending[noteId] = update;
  writeJsonRecord(NOTE_PENDING_UPDATES_KEY, pending);
}

function clearPendingUpdate(noteId: string) {
  const pending = readJsonRecord<PendingNoteUpdate>(NOTE_PENDING_UPDATES_KEY);
  delete pending[noteId];
  writeJsonRecord(NOTE_PENDING_UPDATES_KEY, pending);
}

function hasReminderFired(noteId: string, reminderAt: string) {
  const fired = readJsonRecord<boolean>(NOTE_REMINDER_FIRED_KEY);
  return Boolean(fired[`${noteId}|${reminderAt}`]);
}

function markReminderFired(noteId: string, reminderAt: string) {
  const fired = readJsonRecord<boolean>(NOTE_REMINDER_FIRED_KEY);
  fired[`${noteId}|${reminderAt}`] = true;
  writeJsonRecord(NOTE_REMINDER_FIRED_KEY, fired);
}

function clearReminderFiredForNote(noteId: string) {
  const fired = readJsonRecord<boolean>(NOTE_REMINDER_FIRED_KEY);
  for (const key of Object.keys(fired)) {
    if (key.startsWith(`${noteId}|`)) {
      delete fired[key];
    }
  }
  writeJsonRecord(NOTE_REMINDER_FIRED_KEY, fired);
}

export const useNote = (noteId: string | undefined, token: string | null) => {
  const [note, setNote] = useState<NoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingUpdate = useCallback(async () => {
    if (!noteId || !token) {
      return;
    }

    const pending = getPendingUpdate(noteId);
    if (!pending) {
      setHasPendingSync(false);
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`https://localhost:4000/api/notes/${noteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: pending.title,
          content: pending.content,
          reminderAt: pending.reminderAt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to sync offline changes');
      }

      const data = await res.json();
      const syncedNote = data.note as NoteData;
      setNote(syncedNote);
      setCachedNote(syncedNote);
      clearPendingUpdate(noteId);
      setHasPendingSync(false);
      setError('');
    } catch {
      setHasPendingSync(true);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, token]);

  const fetchNote = useCallback(async () => {
    if (!noteId || !token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`https://localhost:4000/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setNote(null);
        }
        throw new Error('Failed to fetch note');
      }

      const data = await res.json();
      const serverNote = data.note as NoteData;
      const pending = getPendingUpdate(noteId);

      if (pending) {
        const merged = {
          ...serverNote,
          title: pending.title,
          content: pending.content,
          reminderAt: pending.reminderAt,
          updatedAt: pending.updatedAt,
        };
        setNote(merged);
        setCachedNote(merged);
        setHasPendingSync(true);
      } else {
        setNote(serverNote);
        setCachedNote(serverNote);
        setHasPendingSync(false);
      }
    } catch (err) {
      const cached = getCachedNote(noteId);
      if (cached) {
        setNote(cached);
        setHasPendingSync(Boolean(getPendingUpdate(noteId)));
        setError('Offline mode: showing local note draft');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load note');
      }
    } finally {
      setIsLoading(false);
    }
  }, [noteId, token]);

  const saveNote = useCallback(
    async (updatedNote: NoteData) => {
      if (!token || !noteId) return;

      setCachedNote(updatedNote);

      const queueOfflineSave = () => {
        setPendingUpdate(noteId, {
          title: updatedNote.title,
          content: updatedNote.content,
          reminderAt: updatedNote.reminderAt,
          updatedAt: updatedNote.updatedAt,
        });
        setHasPendingSync(true);
      };

      if (!navigator.onLine) {
        queueOfflineSave();
        return;
      }

      try {
        setIsSaving(true);
        const res = await fetch(`https://localhost:4000/api/notes/${noteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: updatedNote.title,
            content: updatedNote.content,
            reminderAt: updatedNote.reminderAt,
          }),
        });

        if (!res.ok) {
          throw new Error('Failed to save note');
        }

        const data = await res.json();
        const savedNote = data.note as NoteData;
        setNote(savedNote);
        setCachedNote(savedNote);
        clearPendingUpdate(noteId);
        setHasPendingSync(false);
        setError('');
      } catch {
        queueOfflineSave();
        setError('You are offline. Changes will sync when connection returns.');
      } finally {
        setIsSaving(false);
      }
    },
    [noteId, token],
  );

  const updateTitle = useCallback(
    (newTitle: string) => {
      if (!note) return;
      const updatedNote = { ...note, title: newTitle };
      setNote(updatedNote);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveNote(updatedNote);
      }, 1000);
    },
    [note, saveNote],
  );

  const updateContent = useCallback(
    (newContent: string) => {
      if (!note) return;
      const updatedNote = { ...note, content: newContent };
      setNote(updatedNote);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveNote(updatedNote);
      }, 1000);
    },
    [note, saveNote],
  );

  const deleteNote = useCallback(async () => {
    if (!token || !noteId) return false;

    try {
      const res = await fetch(`https://localhost:4000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete note');
      }

      clearPendingUpdate(noteId);
      clearReminderFiredForNote(noteId);

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      return false;
    }
  }, [noteId, token]);

  useEffect(() => {
    const onOnline = () => {
      flushPendingUpdate();
    };

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [flushPendingUpdate]);

  useEffect(() => {
    if (navigator.onLine) {
      flushPendingUpdate();
    }
  }, [flushPendingUpdate]);

  const showReminderNotification = useCallback(async () => {
    if (!note || !note.reminderAt) {
      return;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Note reminder', {
      body: note.title || 'You have a note reminder',
      tag: `note-reminder-${note.id}`,
      data: { url: `/note/${note.id}` },
    });
  }, [note]);

  useEffect(() => {
    if (!note || !note.reminderAt) {
      return;
    }

    const reminderTime = Date.parse(note.reminderAt);
    if (Number.isNaN(reminderTime)) {
      return;
    }

    const checkReminder = async () => {
      if (!note?.reminderAt) {
        return;
      }

      if (Date.now() < reminderTime) {
        return;
      }

      if (hasReminderFired(note.id, note.reminderAt)) {
        return;
      }

      await showReminderNotification();
      markReminderFired(note.id, note.reminderAt);
    };

    checkReminder();
    const interval = setInterval(checkReminder, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [note, showReminderNotification]);

  const updateReminderAt = useCallback(
    (reminderAt: string | null) => {
      if (!note) return;

      const updatedNote = {
        ...note,
        reminderAt,
        updatedAt: new Date().toISOString(),
      };

      clearReminderFiredForNote(note.id);
      setNote(updatedNote);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveNote(updatedNote);
      }, 1000);
    },
    [note, saveNote],
  );

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
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
  };
};
