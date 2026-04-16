interface TitleProps {
  title: string;
  onChange?: (newTitle: string) => void;
}

const Title = ({ title, onChange }: TitleProps) => {
  if (!onChange) {
    return <h1 className='text-3xl font-bold mb-4 text-slate-900'>{title}</h1>;
  }

  return (
    <input
      type='text'
      value={title}
      onChange={(e) => onChange(e.target.value)}
      dir='ltr'
      className='w-full text-3xl font-bold mb-4 text-slate-900 bg-transparent border-0 border-b border-slate-200 pb-2 outline-none focus:border-indigo-500 text-left'
      placeholder='Untitled note'
      aria-label='Note title'
    />
  );
};

export default Title;
