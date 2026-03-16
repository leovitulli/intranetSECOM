---
name: "padrao_visual_cards"
description: "Padrão visual obrigatório para Cards, Kanban, Legendas e Tags do Inranet SECOM"
---

# Padrão Visual de Cards e Tags

Sempre que a interface demandar exibição de "Cards" (como no Kanban, Agenda Externa ou Cronograma Semanal) ou "Legendas/Tags" de tipo de mídia (como filtros ou badges de status), você deve estritamente seguir esse padrão visual e de marcação HTML/CSS.

## 1. Tags de Mídia (Legendas de Tipo)

A classe base fundamental para legendas de mídia é a `badge-tag` implementada no `index.css`. Elas reproduzem o efeito de "pílulas" arredondadas (`border-radius: 20px`), compostas por cor de fundo suave e cor de texto vívida, sempre acompanhadas de seus respectivos emojis (exceto Inauguração que possui um ícone especial se necessário).

- **📝 Release:** `<span className="badge-tag badge-texto">📝 Release</span>`
- **🎬 Vídeo:** `<span className="badge-tag badge-video">🎬 Vídeo</span>`
- **📸 Fotos:** `<span className="badge-tag badge-foto">📸 Fotos</span>`
- **🎨 Arte Gráfica:** `<span className="badge-tag badge-arte">🎨 Arte Gráfica</span>`
- **Inauguração:** `<span className="badge-tag badge-inauguracao">Inauguração</span>` (ou acompanhado de ícone `<Building2 />`)

O CSS está localizado em `index.css`:
```css
.badge-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 20px; white-space: nowrap; line-height: 1; }
.badge-texto { background-color: #eaf4fc; color: #0f7ddb; }
.badge-video { background-color: #fdf0f8; color: #e040a3; }
...
```

## 2. Padrão de Layout do Card

Ao construir um card de tarefa, ele deve conter a seguinte estrutura e hierarquia visual:

1. **Header do Card (`.card-header`):**
   - Agrupamento à esquerda (`div.task-badges-container`) contendo as Tags de Mídia (usando as classes acima).
   - Botão de opções à direita (três pontos `MoreHorizontal`).
2. **Título (`.card-title`):** Título principal da pauta/tarefa com destaque escuro/negrito.
3. **Pílula de Secretaria (`inauguracao_secretarias`):** Quando presente (e não for status inauguração master/simples separado), exiba como uma pequena badge azul-clara unificada com ícone 🏛️.
   ```tsx
   <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '99px', background: 'hsl(var(--color-primary) / 0.08)', color: 'hsl(var(--color-primary))', border: '1px solid hsl(var(--color-primary) / 0.2)' }}>
     🏛️ Secretaria do Meio Ambiente
   </span>
   ```
4. **Detalhes/Descrição:** Informações complementares com fonte menor e cinza.
5. **Rodapé do Card (`.card-footer`):**
   - **Data Limite/Status:** Badge arredondada à esquerda com data e/ou horário (ex: "12 de mar" com ícone de relógio).
   - **Membros/Avatars (`.team-avatars`):** Fotos ou iniciais das pessoas envolvidas posicionadas à direita, levemente sobrepostas.

## 3. Cores de Status/Prioridade (Colunas Fixas)
- As bordas esquerdas dos cards (ou o fundo da coluna) indicam status:
  - Laranja/Amarelo: Solicitado / Fazer
  - Verde: Produção
  - Roxo/Rosa: Revisão / Publicado
  - Vermelho Específico: Inauguração

**Importante:** Nunca utilize estilos inline engessados para essas tags novamente. **Sempre utilize as classes `badge-tag` globais** criadas no root da aplicação para manter consistência absoluta de cor.
