---
name: Padrão Visual Obrigatório para Modais
description: Regra absoluta de herança de layout, botões e campos baseados no componente CreateTaskModal
---

# Padrão Visual Obrigatório para Modais

Esta skill define a **REGRA ABSOLUTA** para a criação ou refatoração de qualquer Modal (janela sobreposta) dentro do sistema "Intranet SECOM".

O layout arquitetural de Modais não deve ser inventado ou estruturado do zero. Ele **deve sempre herdar** a estrutura linear e as classes CSS Premium que foram consolidadas no componente `CreateTaskModal.tsx` e `CreateTaskModal.css`.

## 1. Topologia da Tela (NÃO USAR COLUNAS)
- O Modal **não deve ter Sidebars** (barras laterais). 
- Ele é um formulário vertical com Sections que ocupam 100% da largura útil (`width: 100%` ou grid de colunas internas para inputs, mas nunca uma barra engessada cortando a tela).

## 2. Estrutura HTML/React Obrigatória
Qualquer novo Modal deve conter a seguinte hierarquia de invólucros (wrappers):

```tsx
<div className="modal-overlay">
    <div className="modal-content nova-pauta-modal">
        
        {/* CABEÇALHO */}
        <div className="nova-pauta-header-premium">
            <div className="header-left-premium">
                <div className="header-icon-premium"><Icon /></div>
                <div className="header-titles-premium">
                    <h2>Título do Modal</h2>
                    <span className="header-subtitle-premium">Subtítulo explicativo</span>
                </div>
            </div>
            <button className="close-btn-premium"><X /></button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="nova-pauta-body-premium">
            
            {/* SEÇÃO 1 (Padrão claro) */}
            <div className="modal-section-group-premium">
                <div className="section-header-premium">
                    <span className="section-number-premium">01</span>
                    <h3>Nome da Seção</h3>
                </div>
                {/* Inputs aqui */}
            </div>

            {/* SEÇÃO 2 (Fundo cinza alternado para respiro visual) */}
            <div className="modal-section-group-premium alternate-bg-premium">
                <div className="section-header-premium">
                    <span className="section-number-premium">02</span>
                    <h3>Agendamento e Local</h3>
                </div>
                {/* Inputs aqui */}
            </div>

        </div>

        {/* RODAPÉ E BOTÕES DE AÇÃO */}
        <div className="nova-pauta-footer-premium">
            <button type="button" className="btn-cancel-premium">Cancelar</button>
            <button type="submit" className="btn-save-premium">Salvar</button>
        </div>
    </div>
</div>
```

## 3. Elementos Internos e Inputs
- **Inputs de Texto / Data / Hora:** Devem obrigatoriamente usar a classe `input-premium`. Se o label for acompanhado, use `nova-pauta-field-premium` como wrapper.
- **Grids Internas:** Use `fields-grid-2-premium` (2 colunas) ou `fields-grid-3-premium` (3 colunas) para enfileirar inputs horizontalmente e aproveitar a tela.
- **Botões Dinâmicos (Toggle/Pílulas):** Use `prio-pill-premium` (para prioridades) e `material-pill-premium` (para botões de escolha visual). Nunca use botões `<button>` crus sem classes.
- **Botões Ação Final:** Os botões de submissão do formulário (`Salvar`, `Criar`) devem obrigatoriamente usar `btn-save-premium`, pois garantem o padding, fontWeight e cores exatas do Design System.

**Nota da Diretoria:** Toda Inteligência Artificial que manipular este projeto **está proibida** de criar modais com estilos inline ou classes customizadas fora desse padrão. Em caso de dúvidas, espelhe-se exclusivamente no arquivo `CreateTaskModal.tsx`.
