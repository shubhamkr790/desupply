import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Navbar from './components/Navbar';
import SupplierDashboard from './pages/SupplierDashboard';
import LenderMarketplace from './pages/LenderMarketplace';
import BuyerPayables from './pages/BuyerPayables';
import Home from './pages/Home';

// Context
import { Web3Provider } from './context/Web3Context';

// Styles
import './App.css';

function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="App">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/supplier" element={<SupplierDashboard />} />
              <Route path="/lender" element={<LenderMarketplace />} />
              <Route path="/buyer" element={<BuyerPayables />} />
            </Routes>
          </main>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
}

export default App;
