import { createRoot } from 'react-dom/client';
import { Workbench } from './Workbench';
import '@openai/mcp-extensions/app/styles.css';
import 'katex/dist/katex.min.css';
import './style.css';

createRoot(document.getElementById('root')!).render(<Workbench />);
