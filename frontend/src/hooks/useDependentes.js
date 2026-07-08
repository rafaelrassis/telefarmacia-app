import { useState, useCallback, useEffect, useRef } from 'react';
import { EMPTY_CADASTRO, validarNome, validarData } from '../utils/patientDashboardFormat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useDependentes(token) {
  const [dependentes, setDependentes] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null); // null = titular
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [confirmDeleteInDropdown, setConfirmDeleteInDropdown] = useState(null);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [cadastroForm, setCadastroForm] = useState(EMPTY_CADASTRO);
  const [cadastroLoading, setCadastroLoading] = useState(false);
  const [cadastroError, setCadastroError] = useState('');
  const [cadastroFieldErrors, setCadastroFieldErrors] = useState({ nome: '', data: '' });
  const dropdownRef = useRef(null);

  const fetchDependentes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/dependentes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDependentes(await res.json());
    } catch {}
  }, [token]);

  useEffect(() => { fetchDependentes(); }, [fetchDependentes]);

  const handleDeleteDependente = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/dependentes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmDeleteInDropdown(null);
        if (selectedPerson?.id === id) setSelectedPerson(null);
        await fetchDependentes();
      }
    } catch {}
  };

  const handleCadastroDependente = async () => {
    setCadastroError('');
    const erroNome = validarNome(cadastroForm.nome);
    const erroData = validarData(cadastroForm.dataNascimento);
    setCadastroFieldErrors({ nome: erroNome, data: erroData });
    if (erroNome || erroData) return;
    if (!cadastroForm.sexo) {
      setCadastroError('Selecione o sexo.');
      return;
    }
    if (!cadastroForm.aceito) {
      setCadastroError('Confirme a responsabilidade pelo dependente.');
      return;
    }
    setCadastroLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dependentes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: cadastroForm.nome.trim(),
          dataNascimento: cadastroForm.dataNascimento,
          sexo: cadastroForm.sexo,
          parentesco: cadastroForm.parentesco || null,
          aceitouResponsabilidade: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowCadastroModal(false);
        setCadastroForm(EMPTY_CADASTRO);
        setCadastroFieldErrors({ nome: '', data: '' });
        await fetchDependentes();
        setSelectedPerson(data);
      } else {
        setCadastroError(data.error || 'Erro ao cadastrar dependente.');
      }
    } catch {
      setCadastroError('Falha de conexão. Tente novamente.');
    } finally {
      setCadastroLoading(false);
    }
  };

  // Fecha dropdown ao clicar fora ou pressionar Esc
  useEffect(() => {
    if (!dropdownOpen) return;
    const onMouseDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setConfirmDeleteInDropdown(null);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setConfirmDeleteInDropdown(null);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [dropdownOpen]);

  const podeAdicionarMais = dependentes.filter(d => d.ativo).length < 6;

  return {
    dependentes, selectedPerson, setSelectedPerson,
    dropdownOpen, setDropdownOpen,
    confirmDeleteInDropdown, setConfirmDeleteInDropdown,
    showCadastroModal, setShowCadastroModal,
    cadastroForm, setCadastroForm,
    cadastroLoading, cadastroError, setCadastroError,
    cadastroFieldErrors, setCadastroFieldErrors,
    dropdownRef,
    handleDeleteDependente, handleCadastroDependente,
    podeAdicionarMais,
  };
}
