import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/Layout';

// páginas
import Home from '@/pages/Home';               // 👈 agora é o novo Home com Worker
import Event from '@/pages/Event';
import ClassView from '@/pages/ClassView';
import SplitsView from '@/pages/SplitsView';
import SplitsGraph from '@/pages/SplitsGraph';
import AthleteProfile from '@/pages/AthleteProfile';
import ClubEvent from '@/pages/ClubEvent';
import ClubProfile from '@/pages/ClubProfile';
import ImportEvent from '@/pages/ImportEvent';

export default createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> }, // ✅ garante que aponta pro novo componente
      { path: 'evento/:eid', element: <Event /> },
      { path: 'evento/:eid/classe/:cls', element: <ClassView /> },
      { path: 'evento/:eid/classe/:cls/splits', element: <SplitsView /> },
      { path: 'evento/:eid/classe/:cls/splits-graph', element: <SplitsGraph /> },

      { path: 'atleta/:nameSlug', element: <AthleteProfile /> },
      { path: 'evento/:eid/clube/:clubSlug', element: <ClubEvent /> },
      { path: 'clube/:clubSlug', element: <ClubProfile /> },
      { path: 'importar', element: <ImportEvent/> },
    ],
  },
]);
