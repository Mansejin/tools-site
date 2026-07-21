import Header from './components/Header';
import ThoughtCanvas from './components/ThoughtCanvas';
import WelcomeScreen from './components/WelcomeScreen';
import { usePersistence } from './hooks/usePersistence';

export default function App() {
  usePersistence();

  return (
    <div className="app">
      <WelcomeScreen />
      <Header />
      <main className="app-main">
        <ThoughtCanvas />
      </main>
    </div>
  );
}
