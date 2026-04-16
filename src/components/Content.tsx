import { useLayoutEffect, useRef } from 'react';

interface ContentProps {
  content: string;
  onChange: (newContent: string) => void;
}

const Content = ({ content, onChange }: ContentProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = '0px';
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [content]);

  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => {
        e.target.style.height = '0px';
        e.target.style.height = `${e.target.scrollHeight}px`;
        onChange(e.target.value);
      }}
      dir='ltr'
      rows={1}
      className='block w-full min-h-[320px] resize-none overflow-hidden text-lg leading-7 text-slate-900 bg-transparent outline-none text-left placeholder:text-slate-400'
      placeholder='Start writing your note...'
      aria-label='Note content'
    />
  );
};

export default Content;
