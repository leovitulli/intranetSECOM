# Plano de Implementação: Dashboard de Notícias (Radar Secom)

Este projeto visa extrair, processar e visualizar dados de notícias da Prefeitura de Guarulhos para fornecer insights estratégicos sobre a cobertura midiática, atuação das secretarias e quantificação de entregas.

## 📋 Visão Geral
Criação de um sistema de inteligência de dados que realiza a raspagem automatizada (scraper), armazena informações no Supabase e apresenta um dashboard analítico em uma página protegida/escondida da Intranet.

**Tipo de Projeto:** WEB + BACKEND (Supabase)

## 🎯 Critérios de Sucesso
- [x] Raspagem completa do histórico de notícias (desde 2024).
- [x] Dashboard funcional com:
    - Quantidade total e por secretaria.
    - Nuvem de temas/assuntos mais frequentes.
    - Quantificação de **"Entregas"** (revitalizações, reformas, etc.) via filtros de palavras-chave.
    - Comparativo Ano a Ano (YoY).
- [x] Página acessível via rota oculta (ex: `/radar-noticias`).
- [x] Mecanismo de atualização diária (via script ou edge function).

## 🛠️ Tech Stack
- **Banco de Dados:** Supabase (PostgreSQL).
- **Frontend:** React + TypeScript + Recharts + Tailwind CSS.
- **Scraper:** Node.js (utilizando `fetch` e parseamento de HTML).
- **Estilização:** Vanilla CSS / Tailwind (seguindo o padrão visual da Intranet).

---

## 🏗️ Estrutura de Arquivos (Novos)
```plaintext
supabase/
└── migrations/
    └── 20260401_create_noticias_table.sql
src/
├── pages/
│   ├── RadarNoticias.tsx       # Dashboard principal
│   └── RadarNoticias.css       # Estilização única
├── hooks/
│   └── useNoticiasAnalytics.ts # Lógica de dados
└── scripts/
    └── scraper_guarulhos.mjs   # Script de extração
```

---

## 📝 Detalhamento das Tarefas

### Fase 1: Fundação (Banco de Dados)
- **ID:** `task-db-001`
- **Nome:** Criação da Tabela `noticias`
- **Agente:** `database-architect` / `backend-specialist`
- **Habilidades:** `database-design`
- **INPUT:** Requisitos de campos (título, link, data, secretaria, conteúdo, entrega_tipo).
- **OUTPUT:** Migração SQL executada no Supabase.
- **VERIFY:** `select * from noticias` retorna estrutura correta. [DONE]

### Fase 2: Backend & Scraping
- **ID:** `task-scraper-001`
- **Nome:** Implementação do Script de Raspagem
- **Agente:** `backend-specialist`
- **Habilidades:** `nodejs-best-practices`, `api-patterns`
- **INPUT:** URL base (`https://www.guarulhos.sp.gov.br/todas-noticias`).
- **OUTPUT:** Script `.mjs` funcional que popula o banco.
- **VERIFY:** Executar script e verificar > 100 notícias inseridas no Supabase. [DONE]

- **ID:** `task-classifier-001`
- **Nome:** Lógica de Classificação de Entregas
- **Agente:** `backend-specialist`
- **Habilidades:** `clean-code`
- **INPUT:** Conteúdo das notícias.
- **OUTPUT:** Função que identifica palavras-chave (reforma, recapeamento, etc.) e marca no banco. [DONE]

### Fase 3: Dashboard Frontend
- **ID:** `task-ui-001`
- **Nome:** Estrutura da Página `RadarNoticias.tsx`
- **Agente:** `frontend-specialist`
- **Habilidades:** `react-best-practices`
- **INPUT:** Design de Dashboard Secom.
- **OUTPUT:** Rota `/radar-noticias` criada e funcional. [DONE]

- **ID:** `task-charts-001`
- **Nome:** Implementação de Gráficos (Recharts)
- **Agente:** `frontend-specialist`
- **Habilidades:** `frontend-design`
- **INPUT:** Dados do hook `useNoticiasAnalytics`.
- **OUTPUT:** Gráficos de barras (secretarias) e linhas (YoY). [DONE]

---

## ✅ PHASE X: VERIFICAÇÃO FINAL
- [ ] Executar `python .agent/scripts/checklist.py .`
- [ ] Validar se as cores seguem o Blue Secom (sem roxo!).
- [ ] Testar carregamento de dados em desktops e dispositivos móveis.
- [ ] Verificar se a atualização diária está simulada ou agendada.

---
**Nota:** Este plano segue o padrão modular e pode ser executado em paralelo (Backend Scraper vs. Frontend Dashboard).
