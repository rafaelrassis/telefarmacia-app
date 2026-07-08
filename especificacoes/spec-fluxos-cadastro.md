# Spec — Fluxos de Cadastro

## Objetivo

Reorganizar os fluxos de cadastro de paciente e farmacêutico, hoje espalhados em componentes duplicados com regras de validação inconsistentes, em fluxos únicos, explícitos e sem fricção — sem perder nenhuma funcionalidade existente.

## Diagnóstico (levantado por pesquisa no código atual)

**Paciente** — 4 passos por 3 componentes/endpoints diferentes (registro Google/e-mail → stub de onboarding irrelevante para paciente → `PatientProfileForm` → `OnboardingSlider`), com duas flags de "concluído" (`pacienteProfile` existir, `onboardingConcluido`) checadas só no frontend. Campo `dados_saude` (peso/altura/alergias) já existe no banco e é usado pelo `TriagemForm` (peso para cálculo de dose), mas não tem nenhuma tela de cadastro conectada a ele.

**Farmacêutico** — 3 caminhos paralelos que fazem parcialmente a mesma coisa:
1. Aba do `Login.jsx` (Google ou e-mail, com seletor de papel)
2. `PharmacistRegisterModal.jsx` standalone (só Google, acionado pelo link "Seja um farmacêutico")
3. Fluxo de convite do admin (`registrarViaConvite`), com validação de CRF/UF mais rígida e que grava direto em `pharmacistProfile`, sem passar por `completeOnboarding`

Validação de CRF/UF é inconsistente entre os 3 caminhos. Depois do CRF vem upload de documentos (`DocUploadForm`) e aprovação manual do admin (`approvePharmacist`) que já dispara uma notificação in-app (`criarNotificacao`, tipo `conta_aprovada`) — mas o dashboard do farmacêutico ainda exige clique manual em "Verificar status" para refletir a aprovação. Há também **3 endpoints redundantes** fazendo a mesma mutação de aprovação (`approvePharmacist`, `setStatus`, `ativarFarmaceutico`).

## Regras obrigatórias

1. Zero perda de funcionalidade — todo campo/validação hoje existente continua existindo, só reorganizado.
2. Um commit por fase, com `npm test` verde no backend e `npm run build` do frontend sem erros ao final de cada uma.
3. Usar os componentes-base do design system (`Button`, `Input`, `Select`, `Card`) onde couber.
4. Backend só muda onde o fluxo exigir (ex.: salvar cadastro parcial do farmacêutico); qualquer mudança de schema segue o padrão de migração do repo (`backend/scripts/migrate-*.mjs`).
5. Reportar qualquer comportamento estranho encontrado no caminho, sem corrigir por conta própria além do combinado nesta spec.

## Fases

### Fase 1 — Wizard de cadastro do farmacêutico

- Componente de step-wizard único, substituindo `Login.jsx` (bloco de onboarding FARMACEUTICO) e `PharmacistRegisterModal.jsx`:
  1. **Conta e dados pessoais** (login Google/e-mail já feito antes de entrar no wizard; aqui só nome, se ainda não vier do provedor, e telefone)
  2. **Dados profissionais e CRF** (número, UF, bio, tags/áreas de atuação)
  3. **Upload de documentos** (RG/CNH, carteira do CRF)
  4. **Revisão e envio** (resumo de tudo antes de confirmar)
- Validação por etapa (não deixa avançar com campo obrigatório vazio/inválido); botão "Voltar" preserva os dados já digitados.
- Salvamento de rascunho: se o farmacêutico sair no meio do wizard, o progresso não se perde ao voltar (persistir no backend via `PUT /api/auth/onboarding` incremental, ou em rascunho local sincronizado ao avançar de etapa — decidir na implementação conforme o que já existe).
- Após o envio final: tela de status clara ("Em análise", explicando que documentos serão revisados e que a conta será liberada automaticamente). Remover o botão manual "Verificar status" — o dashboard passa a refletir a aprovação sozinho (poll leve do perfil, ou reagir à notificação in-app já disparada por `approvePharmacist`).
- Unificar a validação de CRF (formato) e UF (whitelist) num validador compartilhado, usado também pelo fluxo de convite (`registrarViaConvite`), que continua sendo uma entrada separada (pré-preenchida pelo admin) mas passa a usar a mesma regra.
- Consolidar os 3 endpoints de aprovação do admin (`approvePharmacist`, `setStatus`, `ativarFarmaceutico`) em um só; atualizar o frontend do admin para usá-lo e remover os outros dois.

### Fase 2 — Cadastro do paciente: registro mínimo + onboarding de saúde adiável

- Registro em si já é mínimo (nome, e-mail, senha ou Google) — manter.
- `PatientProfileForm` continua coletando o necessário para agendar (nome completo, data de nascimento, gênero, CPF, aceite dos termos); endereço continua opcional como já é hoje.
- Remover o stub de seleção de papel do `Login.jsx`/`OnboardingForm` para pacientes (é um no-op hoje; só farmacêutico usa `completeOnboarding` de fato).
- Onboarding de saúde (peso/altura/alergias, campo `dados_saude` já existente) passa a ser completável depois do cadastro, nunca bloqueando o agendamento — exceto os campos que a própria triagem (`TriagemForm`) já exige no momento do atendimento (ex.: peso para dosagem pediátrica), que continuam sendo perguntados ali quando fizer falta.
- Card no dashboard do paciente (mesmo padrão visual do `PushToggleBanner`) indicando o que falta preencher no perfil de saúde e por que vale a pena — dispensável, sem bloquear nada.

### Fase 3 — Testes de integração e consolidação do estado de onboarding

- Testes de integração cobrindo os novos endpoints/fluxos (wizard do farmacêutico por etapa, rascunho, aprovação consolidada, onboarding de saúde do paciente), seguindo o padrão de `backend/tests/`.
- Substituir os booleans espalhados (`isNewUser`, presença de `pacienteProfile`, `onboardingConcluido`, `isApproved`, presença de `urlDocCrf`) por um campo de status explícito por role, evitando checagens implícitas de "conclusão" em múltiplos lugares do frontend.

## Critérios de aceite

- [ ] Farmacêutico: um único wizard de 4 etapas, sem duplicação de UI entre login e "Seja um farmacêutico"
- [ ] Validação por etapa, voltar sem perder dados, rascunho preservado se sair no meio
- [ ] Tela de status pós-envio, sem necessidade de "Verificar status" manual
- [ ] Validação de CRF/UF idêntica nos pontos de entrada (wizard + convite)
- [ ] Um único endpoint de aprovação de farmacêutico no admin
- [ ] Paciente: registro mínimo desacoplado do onboarding de saúde (opcional, adiável, nunca bloqueia agendamento)
- [ ] Testes de integração novos, `npm test` verde e `npm run build` sem erros ao final de cada fase
- [ ] Um commit por fase
