import { AppRouter } from './router/AppRouter';
import { useTheme } from './hooks/useTheme';

function App() {
  // Call useTheme here so it runs globally on the whole app, 
  // setting the initial theme and persisting it.
  useTheme();

  return <AppRouter />;
}

export default App;
