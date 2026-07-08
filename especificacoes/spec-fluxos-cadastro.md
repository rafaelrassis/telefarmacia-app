# Spec — Fluxos de Cadastro

## Objetivo

Reorganizar os fluxos de cadastro de paciente e farmacêutico, hoje espalhados em componentes duplicados com regras de validação inconsistentes, em fluxos únicos e explícitos — sem perder nenhuma funcionalidade existente.

## Diagnóstico (levantado por pesquisa no código atual)

**Paciente** — 4 passos por 3 componentes/endpoints diferentes (registro Google/e-mail → stub de onboarding irrelevante para paciente → `PatientProfileForm` → `OnboardingSlider`), com duas flags de "concluído" (`pacienteProfile` existir, `onboardingConcluido`) checadas só no frontend. Campo `dados_saude` (peso/altura/alergias) já existe no banco e é usado pelo `TriagemForm`, mas não tem nenhuma tela de cadastro conectada a ele.

**Farmacêutico** — 3 caminhos paralelos que fazem parcialmente a mesma coisa:
1. Aba do `Login.jsx` (Google ou e-mail, com seletor de papel)
2. `PharmacistRegisterModal.jsx` standalone (só Google, acionado pelo link "Seja um farmacêutico")
3. Fluxo de convite do admin (`registrarViaConvite`), com validação de CRF/UF mais rígida e que grava direto em `pharmacistProfile`, sem passar por `completeOnboarding`

Validação de CRF/UF é inconsistente entre os 3 caminhos. Depois do CRF vem upload de documentos (`DocUploadForm`) e aprovação manual do admin — que hoje tem **3 endpoints redundantes** fazendo a mesma mutação (`approvePharmacist`, `setStatus`, `ativarFarmaceutico`).

## Regras obrigatórias

1. Zero perda de funcionalidade — todo campo/validação hoje existente continua existindo, só reorganizado.
2. Um commit por fase, com `npm test` verde no backend e `npm run build` do frontend sem erros ao final de cada uma.
3. Usar os componentes-base do design system (`Button`, `Input`, `Select`, `Card`) onde couber, já que a paleta/tipografia já está migrada em todo o app.
4. Reportar qualquer comportamento estranho encontrado no caminho, sem corrigir por conta própria além do combinado nesta spec.

## Fases

### Fase 1 — Wizard único de cadastro do farmacêutico

- Criar um componente de step-wizard reutilizável (`PharmacistOnboardingWizard` ou similar): **Conta → Dados profissionais (CRF/UF) → Bio/tags → Documentos**.
- Usado tanto após login Google/e-mail (substituindo o bloco de onboarding duplicado em `Login.jsx`) quanto pelo link "Seja um farmacêutico" (substituindo `PharmacistRegisterModal.jsx`), eliminando a duplicação de código.
- Unificar a validação de CRF (formato) e UF (whitelist) num validador compartilhado, usado também pelo fluxo de convite (`registrarViaConvite`), que continua sendo uma entrada separada (pré-preenchida pelo admin) mas passa a usar a mesma regra.
- Consolidar os 3 endpoints de aprovação do admin em um só; atualizar o frontend do admin para usá-lo e remover os outros dois.

### Fase 2 — Cadastro do paciente: minimizar e separar dados de saúde

- Simplificar `PatientProfileForm` para o mínimo necessário para agendar (nome, data de nascimento, gênero, CPF, aceite dos termos) — endereço continua opcional como já é hoje.
- Remover o stub de seleção de papel do `Login.jsx`/`OnboardingForm` para pacientes (é um no-op hoje; só farmacêutico usa `completeOnboarding` de fato).
- Adicionar uma nova etapa opcional de dados de saúde (peso/altura/alergias, usando o campo `dados_saude` já existente no banco), apresentada como um card dispensável no dashboard (no mesmo padrão do `PushToggleBanner`) — nunca bloqueia o agendamento.

### Fase 3 — Consolidar estado de onboarding

- Substituir os booleans espalhados (`isNewUser`, presença de `pacienteProfile`, `onboardingConcluido`, `isApproved`, presença de `urlDocCrf`) por um campo de status explícito por role, evitando checagens implícitas de "conclusão" em múltiplos lugares do frontend.

## Critérios de aceite

- [ ] Farmacêutico: um único fluxo de wizard, sem duplicação de UI entre login e "Seja um farmacêutico"
- [ ] Validação de CRF/UF idêntica nos 3 pontos de entrada (wizard + convite)
- [ ] Um único endpoint de aprovação de farmacêutico no admin
- [ ] Paciente: cadastro mínimo desacoplado dos dados de saúde (opcionais, adiáveis)
- [ ] `npm test` verde e `npm run build` sem erros ao final de cada fase
- [ ] Um commit por fase
