import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './app/provider';
import { AppRoutes } from './routes/AppRoutes';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
