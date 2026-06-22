# Spec — Tela de Agendamento (Booking Wizard)

## Objetivo

Oferecer ao paciente um fluxo dedicado e guiado para agendar uma consulta, acessível por um botão proeminente no dashboard. Substitui a navegação pelo card de farmacêutico → perfil como ponto de entrada principal para agendamentos.

---

## Fluxo de 3 etapas

```
[Botão "Agendar consulta"] → Etapa 1 → Etapa 2 → Etapa 3 → Confirmação
                               ↑ farmacêutico  ↑ horário   ↑ pagamento
```

### Etapa 1 — Escolher farmacêutico
- Lista todos os farmacêuticos aprovados (`GET /api/pharmacists`)
- Campo de busca filtra por nome ou especialidade (tag) no lado cliente
- Card de cada farmacêutico: nome, CRF, tags, nota média (★), status online
- Click no card seleciona o farmacêutico e avança para Etapa 2

### Etapa 2 — Escolher horário
- Busca slots disponíveis do farmacêutico selecionado (`GET /api/pharmacists/:id/availability`)
- Slots agrupados por data, exibidos como botões de horário
- Mostra o preço da consulta (precoConsulta ou PRECO_PADRAO)
- Click em um horário seleciona e habilita o botão "Próximo"

### Etapa 3 — Confirmar agendamento
- Exibe resumo: farmacêutico, data, hora, duração (30 min), preço
- Busca saldo atual da carteira (`GET /api/carteira/saldo`)
- Se saldo ≥ preço: botão "Confirmar agendamento" habilitado
- Se saldo < preço: aviso de saldo insuficiente + botão "Adicionar créditos" (abre `CheckoutPix`)
- Confirmar → `POST /api/agendamentos/reservar` com `{ id_slot }`
- Em caso de 402 (race condition): mostra erro inline com link para carteira

### Tela de sucesso
- Mostra ✓ + data/hora + nome do farmacêutico
- Botão "Ver meus agendamentos" fecha o wizard

---

## Ponto de entrada

Botão "Agendar consulta" no topo do `PatientDashboard`:
- Visível apenas para usuários com `role === 'PACIENTE'`
- Desabilitado se não tiver perfil de paciente cadastrado (com tooltip)

---

## APIs utilizadas

| Método | Rota | Etapa |
|---|---|---|
| `GET` | `/api/pharmacists` | 1 |
| `GET` | `/api/pharmacists/:id/availability` | 2 |
| `GET` | `/api/carteira/saldo` | 3 |
| `POST` | `/api/agendamentos/reservar` | 3 |

---

## Arquivos

| Arquivo | Ação |
|---|---|
| `frontend/src/components/BookingWizard.jsx` | Criar — componente do wizard completo |
| `frontend/src/components/PatientDashboard.jsx` | Atualizar — adicionar botão + estado do wizard |
