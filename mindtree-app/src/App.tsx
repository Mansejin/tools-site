import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ThoughtCanvas from './components/ThoughtCanvas';
import EditorPanel from './components/EditorPanel';
import WelcomeScreen from './components/WelcomeScreen';
import MobileTabBar from './components/MobileTabBar';
import { usePersistence } from './hooks/usePersistence';
import { useIsMobile } from './hooks/useIsMobile';
import { useThoughtStore } from './store/useThoughtStore';

export default function App() {
  usePersistence();
  const isMobile = useIsMobile();
  const mobileTab = useThoughtStore((s) => s.mobileTab);

  return (
    <div className={`app ${isMobile ? 'is-mobile' : ''}`}>
      <WelcomeScreen />
      <Header />
      <main className="app-main">
        {(!isMobile || mobileTab === 'map') && <ThoughtCanvas />}
        {(!isMobile || mobileTab === 'list') && (
          <Sidebar className={isMobile ? 'sidebar-mobile' : ''} />
        )}
        {!isMobile && <EditorPanel />}
      </main>
      {isMobile && <MobileTabBar />}
    </div>
  );
}
