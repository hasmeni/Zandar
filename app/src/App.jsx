import { useState } from 'react';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import QuickAccess from './components/QuickAccess'

function App() {
  const [activePage, setActivePage] = useState("");

  return (
    <>
      <div className='min-h-screen'>
        <Navbar activeTab={activePage} setActiveTab={setActivePage} />
        {/* <QuickAccess /> */}
        <Dashboard activePage={activePage} />
      </div>
    </>
  );
}

export default App;