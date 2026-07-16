// Senhas óbvias mais comuns em pt-BR/en — checagem além do comprimento mínimo.
const TRIVIAL_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', 'password', 'password1',
  'senha123', 'senha1234', '87654321', 'qwertyui', 'a1b2c3d4',
  '11111111', '00000000', 'abcd1234', 'iloveyou', 'admin123',
]);

const isSequential = (value) => {
  if (!/^\d+$/.test(value)) return false;
  let ascending = true;
  let descending = true;
  for (let i = 1; i < value.length; i++) {
    const diff = value.charCodeAt(i) - value.charCodeAt(i - 1);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }
  return ascending || descending;
};

// Mínimo 8 caracteres, sem exigir símbolos/maiúsculas — comprimento importa
// mais que complexidade artificial. Rejeita apenas: igual à senha atual,
// igual ao e-mail/usuário do e-mail, e sequências/senhas triviais óbvias.
export const validateNewPassword = (novaSenha, { email, senhaAtualPlain } = {}) => {
  if (!novaSenha || novaSenha.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.';
  }
  if (senhaAtualPlain && novaSenha === senhaAtualPlain) {
    return 'A nova senha não pode ser igual à senha atual.';
  }
  const lower = novaSenha.toLowerCase();
  if (email) {
    const emailLower = email.toLowerCase();
    const localPart = emailLower.split('@')[0];
    if (lower === emailLower || lower === localPart) {
      return 'A senha não pode ser igual ao seu e-mail.';
    }
  }
  if (TRIVIAL_PASSWORDS.has(lower) || isSequential(novaSenha)) {
    return 'Essa senha é muito óbvia. Escolha uma senha diferente.';
  }
  return null;
};
