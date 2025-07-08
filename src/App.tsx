// src/App.tsx
import Layout from './components/layout/Layout';
import Overview from './pages/Overview';
import C4TSAnalytics from './pages/C4TSAnalytics';
import StructurizrAnalytics from './pages/StructurizrAnalytics';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom'; // Assuming BrowserRouter here or in main.tsx

function App() {
  return (
    <BrowserRouter> {/* Or ensure this is in main.tsx */}
      <Routes>
        <Route element={<Layout />}> {/* Layout is now a route element wrapper */}
          <Route path="/" element={<Overview />} />
          <Route path="/c4ts" element={<C4TSAnalytics />} />
          <Route path="/structurizr" element={<StructurizrAnalytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;