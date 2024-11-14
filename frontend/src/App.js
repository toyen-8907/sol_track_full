// App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import WalletDetails from './WalletDetails';

const App = () => {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h2>Solana 帳戶監控</h2>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallet/:address" element={<WalletDetails />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
