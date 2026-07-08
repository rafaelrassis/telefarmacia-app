import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from '../home/Footer.jsx';
import PharmacistSignupWizard from '../pharmacist/PharmacistSignupWizard.jsx';

const Layout = () => {
  const [pharmacistModalOpen, setPharmacistModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onRegisterPharmacist={() => setPharmacistModalOpen(true)} />
      <main className="flex-1">
        <Outlet context={{ onRegisterPharmacist: () => setPharmacistModalOpen(true) }} />
      </main>
      <Footer onRegisterPharmacist={() => setPharmacistModalOpen(true)} />
      {pharmacistModalOpen && (
        <PharmacistSignupWizard onClose={() => setPharmacistModalOpen(false)} />
      )}
    </div>
  );
};

export default Layout;
