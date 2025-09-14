type Props = {
  value: 'cards'|'list';
  onChange: (v:'cards'|'list') => void;
};
export default function ViewToggle({ value, onChange }: Props){
  return (
    <div className="seg">
      <button
        className={`seg-btn ${value==='cards'?'active':''}`}
        onClick={()=>onChange('cards')}
        aria-pressed={value==='cards'}
        title="Ver como cartões"
      >🗂️ Cards</button>
      <button
        className={`seg-btn ${value==='list'?'active':''}`}
        onClick={()=>onChange('list')}
        aria-pressed={value==='list'}
        title="Ver como lista"
      >📋 Lista</button>
    </div>
  );
}