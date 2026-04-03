# OST App

Herramienta de product discovery basada en el **Opportunity Solution Tree** de Teresa Torres. Permite gestionar oportunidades, evidencia, hipotesis y experimentos en un arbol visual, con evaluacion por IA y colaboracion en tiempo real.

## Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + RLS + Realtime + Auth)
- **IA**: Claude Sonnet via Anthropic SDK
- **Auth**: Google OAuth via Supabase Auth
- **Design System**: Paradigma (dark/light mode)

## Secciones

| Seccion | Descripcion |
|---------|-------------|
| **Projects** | Lista y gestion de proyectos con roles (admin/usuario/viewer) |
| **OST Tree** | Arbol visual de oportunidades |
| **Opportunity Detail** | Evidencia, hipotesis, experimentos, top-3 |
| **AI Evaluation** | Evaluacion con Claude + conversacion de refinamiento |
| **Business Context** | Contexto estrategico para alimentar evaluaciones IA |

## Setup

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY

# Desarrollo
npm run dev

# Build
npm run build
```

## Modelo de dominio

```
Project
  └── Oportunidad
        ├── Evidencia (cita | hecho | observacion)
        ├── Hipotesis (to do → en curso → terminada)
        │     └── Experimento (type, success_criterion, effort, impact)
        └── Evaluacion IA (Claude) + Conversacion de refinamiento
```

## Deploy

La app se despliega en GitHub Pages con base path `/ost_app`.
