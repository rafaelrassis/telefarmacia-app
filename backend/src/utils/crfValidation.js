export const CRF_REGEX = /^\d{1,6}$/;

export const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

// Retorna uma mensagem de erro em português se inválido, ou null se válido.
export const validateCrf = (crfNumber, crfUF) => {
  if (!crfNumber || !crfUF) return 'CRF e UF são obrigatórios.';
  if (!UF_LIST.includes(String(crfUF).toUpperCase())) return 'UF do CRF inválida.';
  if (!CRF_REGEX.test(String(crfNumber).trim())) return 'Número do CRF inválido (somente dígitos, até 6 caracteres).';
  return null;
};
