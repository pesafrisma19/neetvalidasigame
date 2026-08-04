import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './layouts/AppLayout';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MasterDataPage } from './pages/MasterDataPage';
import { ApiKeyPage } from './pages/ApiKeyPage';
import { LogViewerPage } from './pages/LogViewerPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<PlaygroundPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="master-data" element={<MasterDataPage />} />
            <Route path="api-keys" element={<ApiKeyPage />} />
            <Route path="logs" element={<LogViewerPage />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
