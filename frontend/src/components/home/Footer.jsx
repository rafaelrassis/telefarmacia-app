import React from 'react';
import { Link } from 'react-router-dom';

const Footer = ({ onRegisterPharmacist }) => (
  <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 mt-4">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid md:grid-cols-3 gap-10 mb-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
            <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-black">F</span>
            Farma<span className="text-blue-400">Consulta</span>
          </div>
          <p className="text-sm leading-relaxed text-slate-500 max-w-xs">
            Conectando pacientes a farmacêuticos clínicos para orientação segura sobre medicamentos. 100% online.
          </p>
          <div className="flex gap-2 mt-4">
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-medium">CRF Verificado</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-medium">Somente MIP</span>
          </div>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Plataforma</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/entrar" className="hover:text-white transition">Agendar consulta</Link></li>
            {onRegisterPharmacist && (
              <li>
                <button onClick={onRegisterPharmacist} className="hover:text-white transition text-left">
                  Seja um farmacêutico
                </button>
              </li>
            )}
            <li><button onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition">Como funciona</button></li>
            <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition">FAQ</button></li>
          </ul>
        </div>

        {/* Contato */}
        <div>
          <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-wider">Contato</h4>
          <ul className="space-y-2.5 text-sm text-slate-500">
            <li>E-mail: <span className="text-slate-400">suporte@farmaconsulta.com.br</span></li>
            <li>WhatsApp: <span className="text-slate-400">(11) 99999-9999</span></li>
            <li>Disponibilidade: <span className="text-slate-400">Seg–Sex, 8h–18h</span></li>
          </ul>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-900 text-center text-[10px] text-slate-600">
        <p>© {new Date().getFullYear()} FarmaConsulta. Todos os direitos reservados. As consultas não substituem a prescrição médica. Somente MIPs são orientados.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
