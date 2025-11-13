# 🎯 Guia: Criar Atividade PLUGGED para Professor

## 📋 Opções para Criar Atividade PLUGGED

### 1️⃣ Via API (Teste Rápido)

```powershell
# PowerShell - Criar atividade PLUGGED de teste
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/atividades" `
  -ContentType "application/json" `
  -Body (@{
    titulo = "Contagem Binária - Exercício 1"
    descricao = "Calcule o valor decimal dos cartões binários"
    tipo = "PLUGGED"
    nota = 10
  } | ConvertTo-Json)
```

### 2️⃣ Campos Obrigatórios

| Campo       | Tipo                     | Obrigatório | Exemplo              |
| ----------- | ------------------------ | ----------- | -------------------- |
| `titulo`    | string                   | ✅ Sim      | "Exercício Binário"  |
| `tipo`      | "PLUGGED" \| "UNPLUGGED" | ✅ Sim      | "PLUGGED"            |
| `nota`      | number                   | ✅ Sim      | 10                   |
| `descricao` | string                   | ❌ Não      | "Calcule os valores" |

### 3️⃣ Exemplo de Payload Completo

```json
{
  "titulo": "Conversão Binário-Decimal",
  "descricao": "Exercício interativo de conversão de binário para decimal",
  "tipo": "PLUGGED",
  "nota": 10,
  "script": null,
  "linguagem": null
}
```

### 4️⃣ Como o Professor Vê a Atividade

Após criar, a atividade aparece automaticamente em:

1. **Lista de atividades** do professor
2. Pode ser **aplicada em turmas**
3. Aparece para **alunos da turma**
4. Professor vê **estatísticas de desempenho**

### 5️⃣ Como Aplicar em Turma

```javascript
// 1. Professor seleciona atividade PLUGGED
// 2. Clica em "Aplicar em Turma"
// 3. Seleciona turmas
// 4. Confirma aplicação

// Backend cria registros em AtividadeTurma:
POST /api/aplicaratividade
{
  "atividadeId": 42,
  "turmasIds": [1, 2, 3],
  "professorId": 5
}
```

### 6️⃣ Verificar Se Funcionou

```powershell
# Listar todas atividades
Invoke-RestMethod -Uri "http://localhost:3000/api/atividades"

# Listar atividades do professor
Invoke-RestMethod -Uri "http://localhost:3000/api/professores/atividadesprofessor"
```

### 7️⃣ Diferenças PLUGGED vs UNPLUGGED

| Aspecto               | PLUGGED              | UNPLUGGED                |
| --------------------- | -------------------- | ------------------------ |
| **Tipo de exercício** | Dinâmico/interativo  | Estático (PDF, texto)    |
| **Correção**          | Automática           | Manual pelo professor    |
| **Tentativas**        | Ilimitadas           | 1 resposta               |
| **Componente**        | `PluggedContagemMCQ` | Lista de arquivos        |
| **Tabela DB**         | `RealizacaoPlugged`  | `RespostaAlunoAtividade` |

### 8️⃣ Exemplo Completo com curl

```bash
# Linux/Mac/Git Bash
curl -X POST http://localhost:3000/api/atividades \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Binário Nível 1",
    "descricao": "Exercício básico de conversão",
    "tipo": "PLUGGED",
    "nota": 10
  }'
```

### 9️⃣ Troubleshooting

#### Problema: "tipo inválido"

**Causa**: Campo tipo não é "PLUGGED" ou "UNPLUGGED"
**Solução**: Usar exatamente `"tipo": "PLUGGED"` (maiúsculas)

#### Problema: "titulo é obrigatório"

**Causa**: Campo titulo vazio ou ausente
**Solução**: Adicionar `"titulo": "Nome da Atividade"`

#### Problema: "nota é obrigatória"

**Causa**: Campo nota ausente ou não é número
**Solução**: Adicionar `"nota": 10` (sem aspas)

#### Problema: Atividade não aparece para alunos

**Causa**: Não foi aplicada em nenhuma turma
**Solução**: Usar "Aplicar em Turma" na interface do professor

### 🔟 Fluxo Completo

```
1. Professor cria atividade PLUGGED
   ↓
2. Sistema salva no banco (tabela Atividade)
   ↓
3. Atividade aparece na lista do professor
   ↓
4. Professor aplica em turmas
   ↓
5. Sistema cria registros em AtividadeTurma
   ↓
6. Alunos da turma veem a atividade
   ↓
7. Alunos respondem (múltiplas tentativas)
   ↓
8. Sistema salva em RealizacaoPlugged
   ↓
9. Professor vê estatísticas de desempenho
```

---

## ✅ Próximos Passos

Se você quiser adicionar um **botão na interface** do professor para criar atividades PLUGGED facilmente, posso implementar um formulário visual. Basta pedir! 🚀

---

**Arquivo criado**: `docs/GUIA_CRIAR_ATIVIDADE_PLUGGED.md`
**Última atualização**: 8 de novembro de 2025
