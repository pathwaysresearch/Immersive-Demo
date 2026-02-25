import { MathJaxContext } from 'better-react-mathjax';
import './App.css';
import { AgentInterface } from './components/AgentInterface';
import { Analytics } from "@vercel/analytics/react"
function App() {
  return (
    
    <MathJaxContext>
      <Analytics />
      <div className="app">
        <AgentInterface />
      </div>
    </MathJaxContext>
  );
}

export default App;
