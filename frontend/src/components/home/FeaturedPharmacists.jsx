import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AVATAR_COLORS = [
  'from-blue-600 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-500',
  'from-violet-500 to-purple-600',
];

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

const StarRating = ({ n = 5 }) => (
  <div className="flex gap-0.5">
    {[...Array(n)].map((_, i) => (
      <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const VerifiedBadge = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
    CRF Verificado
  </span>
);

const PharmacistCard = ({ pharm, index }) => {
  const profile = pharm.pharmacistProfile;
  const consultaCount = pharm._count?.appointmentsAsPharmacist ?? 0;
  const online = profile?.isOnline;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col">
      {/* Card header — colored band */}
      <div
        className={`h-16 bg-gradient-to-r ${AVATAR_COLORS[index % AVATAR_COLORS.length]} relative`}
        style={{ opacity: 0.15 }}
      >
        {online && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white/90 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Online
          </span>
        )}
      </div>

      <div className="px-5 pb-5 -mt-8 flex flex-col flex-1">
        {/* Avatar + verified */}
        <div className="flex items-end justify-between mb-3">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-white font-bold text-xl flex items-center justify-center shadow-lg border-2 border-white`}>
            {initials(pharm.name)}
          </div>
          <VerifiedBadge />
        </div>

        {/* Name + CRF */}
        <h3 className="font-bold text-slate-900 text-base leading-tight">{pharm.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5 mb-3">CRF-{profile?.crfUF} {profile?.crfNumber}</p>

        {/* Rating + consultations */}
        <div className="flex items-center gap-2 mb-4">
          <StarRating />
          <span className="text-xs font-bold text-slate-700">4.9</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">
            {consultaCount > 0
              ? `${consultaCount} consulta${consultaCount !== 1 ? 's' : ''}`
              : 'Novo'}
          </span>
        </div>

        {/* Tags */}
        {profile?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {profile.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bio */}
        {profile?.bio && (
          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 italic border-l-2 border-slate-200 pl-2.5 mb-1 flex-1">
            "{profile.bio}"
          </p>
        )}

        <div className="flex-1" />

        {/* Footer: price + CTA */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider leading-none">A partir de</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">R$ 49,90</p>
          </div>
          <Link
            to="/entrar"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition shadow-sm shadow-blue-200"
          >
            Ver horários
          </Link>
        </div>
      </div>
    </div>
  );
};

const Skeleton = () => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
    <div className="h-16 bg-slate-200" />
    <div className="px-5 pb-5 -mt-8">
      <div className="w-16 h-16 bg-slate-200 rounded-2xl mb-3 border-2 border-white" />
      <div className="h-4 bg-slate-200 rounded w-36 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-20 mb-4" />
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => <div key={i} className="w-3.5 h-3.5 bg-slate-200 rounded-sm" />)}
      </div>
      <div className="h-8 bg-slate-200 rounded-2xl mt-auto" />
    </div>
  </div>
);

const FeaturedPharmacists = () => {
  const [pharmacists, setPharmacists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/pharmacists`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setPharmacists(data.slice(0, 3)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="farmaceuticos" className="bg-[#F8FAFC] border-t border-slate-200 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.12em] mb-3">Profissionais</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Farmacêuticos em destaque</h2>
            <p className="text-slate-500 text-sm mt-1">Profissionais verificados com excelentes avaliações.</p>
          </div>
          <Link to="/entrar" className="hidden md:inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
            Ver todos
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : pharmacists.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            Nenhum farmacêutico disponível no momento.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {pharmacists.map((pharm, i) => (
              <PharmacistCard key={pharm.id} pharm={pharm} index={i} />
            ))}
          </div>
        )}

        <div className="text-center mt-6 md:hidden">
          <Link to="/entrar" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition">
            Ver todos os farmacêuticos →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPharmacists;
