import { MathJaxContext } from 'better-react-mathjax';
import './App.css';
import { AgentInterface } from './components/AgentInterface';

function App() {
  return (
    <MathJaxContext>
      <div className="app">
        <AgentInterface />
      </div>
    </MathJaxContext>
  );
}

export default App;
