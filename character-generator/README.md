# Gerador de Personagens D&D 2024

Gerador de personagens para Dungeons & Dragons 2024 usando GPT-4 e MCP (Model Context Protocol) para acesso a dados oficiais do sistema.

## 🚀 Características

- **Geração Inteligente**: Usa GPT-4 para criar personagens balanceados e coerentes
- **Dados Oficiais**: Acessa dados oficiais do D&D 2024 através do MCP
- **Interface Moderna**: Interface web responsiva e intuitiva
- **Tipagem Completa**: Desenvolvido em TypeScript para maior confiabilidade
- **Exportação**: Suporte para download em JSON e impressão

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Chave da API OpenAI
- Servidor MCP configurado

## 🛠️ Instalação

1. **Clone o repositório**
   ```bash
   git clone <url-do-repositorio>
   cd character-generator
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**
   ```bash
   cp env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   OPENAI_API_KEY=sua_chave_api_openai_aqui
   MCP_API_URL=http://localhost:3001
   PORT=3000
   ```

4. **Compile o projeto**
   ```bash
   npm run build
   ```

## 🚀 Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm start
```

### Modo Watch (desenvolvimento)
```bash
npm run watch
```

## 📁 Estrutura do Projeto

```
character-generator/
├── src/
│   ├── services/
│   │   └── CharacterGenerator.ts    # Lógica de geração de personagens
│   ├── types/
│   │   └── character.d.ts           # Tipos TypeScript
│   ├── character-model.ts           # Modelo de dados do personagem
│   └── index.ts                     # Servidor Express
├── public/
│   ├── index.html                   # Interface web
│   ├── script.js                    # JavaScript do frontend
│   └── styles.css                   # Estilos CSS
├── dist/                            # Código compilado
├── package.json
├── tsconfig.json
└── README.md
```

## 🔧 Configuração do MCP

O projeto utiliza o MCP (Model Context Protocol) para acessar dados oficiais do D&D 2024. Certifique-se de que:

1. O servidor MCP está rodando na URL especificada em `MCP_API_URL`
2. O servidor MCP expõe endpoints para:
   - Busca de magias por classe
   - Informações de classes e subclasses
   - Dados de raças
   - Validação de combinações

## 🎮 Como Usar

1. **Acesse a interface web** em `http://localhost:3000`

2. **Preencha os dados do personagem**:
   - Nível (1-20)
   - Classe (Mago, Feiticeiro, Clérigo, etc.)
   - Subclasse (opcional)
   - Raça (opcional)
   - Nível de poder (baixo, médio, alto)
   - Opções adicionais (história, personalidade)

3. **Clique em "Gerar Personagem"**

4. **Visualize o resultado** com todos os dados do personagem

5. **Exporte ou imprima** a ficha conforme necessário

## 🔌 API Endpoints

### POST /api/generate
Gera um novo personagem baseado nos parâmetros fornecidos.

**Parâmetros:**
```json
{
  "level": 5,
  "class": "Mago",
  "subclass": "Escola de Evocação",
  "race": "Elf",
  "powerLevel": "medium",
  "includeHistory": true,
  "includePersonality": true,
  "context": "Campanha em ambiente urbano"
}
```

**Resposta:**
```json
{
  "name": "Nome do Personagem",
  "race": "Elf",
  "class": "Mago",
  "subclass": "Escola de Evocação",
  "level": 5,
  "attributes": {
    "strength": 8,
    "dexterity": 14,
    "constitution": 12,
    "intelligence": 18,
    "wisdom": 10,
    "charisma": 13
  },
  "spells": {
    "cantrips": ["Prestidigitação", "Raio de Gelo"],
    "level1": ["Proteção contra o Bem e Mal", "Detectar Magia"],
    "level2": ["Sugestão", "Invisibilidade"],
    "level3": ["Bola de Fogo", "Voo"]
  },
  "equipment": ["Cajado arcano", "Mochila de aventureiro"],
  "proficiencies": ["Arcanismo", "História"],
  "features": ["Conjuração Arcana", "Recuperação Arcana"],
  "background": "História detalhada do personagem...",
  "personality": "Traços de personalidade..."
}
```

### GET /api/health
Verifica o status da API.

## 🛠️ Desenvolvimento

### Scripts Disponíveis

- `npm run build` - Compila o projeto TypeScript
- `npm run dev` - Executa em modo desenvolvimento
- `npm run watch` - Executa com hot reload
- `npm run clean` - Remove arquivos compilados
- `npm start` - Executa em produção

### Adicionando Novas Funcionalidades

1. **Novos tipos**: Adicione em `src/types/`
2. **Novos serviços**: Adicione em `src/services/`
3. **Novos endpoints**: Adicione em `src/index.ts`

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Se encontrar problemas ou tiver dúvidas:

1. Verifique se todas as dependências estão instaladas
2. Confirme se as variáveis de ambiente estão configuradas
3. Verifique se o servidor MCP está rodando
4. Consulte os logs do servidor para erros

## 🔄 Changelog

### v1.0.0
- Migração para TypeScript
- Integração com MCP como API externa
- Interface web moderna
- Suporte completo ao D&D 2024 