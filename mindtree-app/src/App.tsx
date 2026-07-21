import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ThoughtCanvas from './components/ThoughtCanvas';
import EditorPanel from './components/EditorPanel';
import WelcomeScreen from './components/WelcomeScreen';
import { usePersistence } from './hooks/usePersistence';

export default function App() {
  usePersistence();
  return (
    <div className="app">
      <WelcomeScreen />
      <Header />
      <main className="app-main">
        <Sidebar />
        <ThoughtCanvas />
        <EditorPanel />
      </main>
    </div>
  );
}
