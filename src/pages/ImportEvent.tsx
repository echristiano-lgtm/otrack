import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { importEventWithCourse, getEventBlob } from '@/utils/api';
import { upsertEvent } from '@/utils/storage';

const ALLOWED = ['.xml', '.iof', '.html', '.htm'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function validExt(name?: string) {
  if (!name) return false;
  const n = name.toLowerCase();
  return ALLOWED.some(ext => n.endsWith(ext));
}

export default function ImportEvent() {
  const [resultFile, setResultFile] = useState<File | null>(null);
  const [courseFile, setCourseFile] = useState<File | null>(null);
  const [organizer, setOrganizer] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string>('');
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg('');

    if (!resultFile) {
      setErrMsg('Selecione o arquivo de resultados (IOF ResultList).');
      return;
    }
    if (!validExt(resultFile.name)) {
      setErrMsg('Resultados devem ser .xml, .iof, .html ou .htm.');
      return;
    }
    if (resultFile.size > MAX_SIZE) {
      setErrMsg('Arquivo de resultados muito grande (limite 10MB).');
      return;
    }
    if (courseFile) {
      if (!validExt(courseFile.name)) {
        setErrMsg('O arquivo de percurso deve ser .xml, .iof, .html ou .htm.');
        return;
      }
      if (courseFile.size > MAX_SIZE) {
        setErrMsg('Arquivo de percurso muito grande (limite 10MB).');
        return;
      }
    }

    try {
      setBusy(true);

      // Chama o backend
      const meta = await importEventWithCourse({
        resultFile,
        courseFile: courseFile ?? undefined,
        organizer: organizer.trim() || undefined,
      });

      if (!meta?.id) {
        throw new Error('Importou, mas o backend não retornou o ID do evento.');
      }

      // Tenta baixar o blob completo para já deixar no storage
      try {
        const ev = await getEventBlob(meta.id);
        if (typeof upsertEvent === 'function') {
          upsertEvent(ev);
        }
      } catch (err) {
        console.warn('Import ok, mas falhou ao buscar blob. Prosseguindo…', err);
      }

      // Vai direto para a página do evento
      navigate(`/evento/${encodeURIComponent(meta.id)}`);
    } catch (e: any) {
      setErrMsg(e?.message || 'Falha ao importar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Importar evento (IOF)</h2>
          <div className="row" style={{ gap: 8 }}>
            <Link className="btn" to="/">🏠 Início</Link>
          </div>
        </div>

        {errMsg ? (
          <div className="card-sm" style={{ margin: '10px 0', borderColor: '#dc2626', color: '#dc2626' }}>
            <strong>Erro:</strong> {errMsg}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="grid" style={{ gap: 12, marginTop: 8 }}>
          <div className="card-sm">
            <h3>1) Resultados (obrigatório)</h3>
            <div className="small muted" style={{ marginBottom: 6 }}>
              Aceita .xml, .iof, .html, .htm com conteúdo IOF ResultList (MEOS/Helga/afins).
            </div>
            <label className="btn">
              Selecionar arquivo…
              <input
                type="file"
                accept=".xml,.iof,.html,.htm"
                onChange={(e) => setResultFile(e.target.files?.[0] || null)}
                hidden
              />
            </label>
            {resultFile && (
              <div className="small" style={{ marginTop: 6 }}>
                Selecionado: <strong>{resultFile.name}</strong> · {(resultFile.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>

          <div className="card-sm">
            <h3>2) Dados do percurso (opcional)</h3>
            <div className="small muted" style={{ marginBottom: 6 }}>
              IOF CourseData — se fornecido, será salvo para análises (distâncias/ordem) no futuro.
            </div>
            <label className="btn">
              Selecionar arquivo…
              <input
                type="file"
                accept=".xml,.iof,.html,.htm"
                onChange={(e) => setCourseFile(e.target.files?.[0] || null)}
                hidden
              />
            </label>
            {courseFile && (
              <div className="small" style={{ marginTop: 6 }}>
                Selecionado: <strong>{courseFile.name}</strong> · {(courseFile.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>

          <div className="card-sm">
            <h3>3) Organizador (opcional)</h3>
            <div className="small muted" style={{ marginBottom: 6 }}>
              Preencha para sobrescrever caso o arquivo XML não possua essa informação.
            </div>
            <input
              type="text"
              placeholder="Ex.: Clube de Orientação X"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              style={{ minWidth: 280, maxWidth: 480 }}
            />
          </div>

          <div className="row" style={{ gap: 8 }}>
            <button className="btn" type="submit" disabled={busy || !resultFile}>
              {busy ? 'Importando…' : 'Importar evento'}
            </button>
            <Link className="btn" to="/">Cancelar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}