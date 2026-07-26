# Hubio IA — Pendientes

Documento de auditoría del estado real del **AI Engine / agentes** en el repositorio (julio 2026).  
Base: inspección de `lib/ai/`, `app/api/ai/`, `components/ai/`, `app/herramientas/page.tsx`, Prisma, `.env.example` y `package.json`.  
No inventa features: si algo está stubbeado o a medias, aparece como pendiente.

---

## Resumen ejecutivo

| Área | Estado estimado |
|------|-----------------|
| Motor IA (`lib/ai/`) + 9 agentes registrados | **~85 %** |
| Asistente Coach (streaming, favoritos, summary, tool-invoke) | **~80 %** |
| Herramientas UI + enhance IA | **~75 %** |
| Dashboard / analytics / POS insights | **~70 %** |
| Infra producción (Redis, rate-limit distribuido, cron hosted) | **~25 %** |
| Nivel “premium SEO” del mega-spec original | **~55 %** |

**Veredicto:** hay una base **usable en desarrollo** (agentes, APIs, UI y migraciones). Lo que falta para producción multi-instancia y para cerrar el mega-spec es sobre todo **infra**, **profundidad SEO**, **cron operativo** y algunos **huecos de orquestación** (p. ej. competidores desde el Coach).

Estimación global vs plan de agentes: **~70–75 % hecho**, **~25–30 % pendiente**.

---

## Cómo activar lo ya implementado

### 1. Variables de entorno

Copiá `.env.example` → `.env` y completá al menos:

```env
AI_PROVIDER=agentrouter
AI_BASE_URL=https://agentrouter.org/v1
AI_API_KEY=tu-clave
AI_MODEL=gpt-5.5
```

Opcionales útiles:

- `GOOGLE_PAGESPEED_API_KEY` — score real de PageSpeed en SEO  
- `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OLLAMA_*` — fallbacks / proveedores nativos  
- `CRON_SECRET` — cron de insights  
- `AI_CACHE_URL` — **aún no hace Redis real** (ver P0); hoy solo avisa y usa memoria  

### 2. Migraciones Prisma

```bash
npx prisma migrate deploy
# o en local:
npx prisma migrate dev
```

Migraciones IA relevantes:

- `20260726120000_ai_conversations` — `AiConversation`, `AiMessage`, `AiInsightCache`  
- `20260726150000_ai_agent_upgrades` — columnas `summary` y `favorite` en `AiConversation`  

Sin migrar, favoritos / memoria / caché de insights fallan en runtime.

### 3. Arrancar

```bash
npm run dev
```

(Puerto por defecto del proyecto: **1337**.)

### 4. URLs / endpoints de prueba

| Qué | Cómo |
|-----|------|
| Asistente | `http://localhost:1337/asistente` (sesión requerida) |
| Chat API | `POST /api/ai/assistant` (SSE), `GET /api/ai/assistant`, `PATCH` favoritos |
| Insights panel | `GET /api/ai/insights?period=weekly` |
| Analíticas IA | `GET /api/ai/analytics?days=30` |
| POS insights | `POST /api/ai/pos-insights` (plan con acceso POS) |
| Cron | `GET /api/ai/cron/insights` con `Authorization: Bearer <CRON_SECRET>` |
| Herramientas | `/herramientas` → SEO, precios, ROI, contratos, prompts, paletas |

### 5. Smoke checks rápidos

1. Con `AI_API_KEY` válido: mensaje on-topic en `/asistente` → streaming.  
2. Marcar ★ favorita → recargar → sigue arriba.  
3. SEO con 1–2 URLs competidor → tabla `comparison` / bloque `prediccion` si el modelo responde JSON.  
4. Dashboard → bloques `DashboardAiInsights` + `AnalyticsAiPanel`.  
5. POS → Reportes → “Insights IA”.

---

## Pendientes por prioridad

### P0 — Bloqueantes / operativos

#### P0.1 — Aplicar migraciones en cada entorno

- **Qué falta:** Ejecutar y verificar `migrate deploy` en local / staging / prod. El código y las migraciones existen; la BD puede no tenerlas.  
- **Por qué importa:** Sin `favorite` / `summary` / tablas AI, asistente e insights rompen.  
- **Dónde tocar:** `prisma/migrations/20260726120000_ai_conversations/`, `prisma/migrations/20260726150000_ai_agent_upgrades/`, ops de deploy.  
- **Criterio de hecho:** `\d "AiConversation"` (o equivalente) muestra `summary` y `favorite`; smoke del asistente OK.  
- **Esfuerzo:** S  

#### P0.2 — Redis real para caché IA (`ioredis` no está instalado)

- **Qué falta:** `ioredis` **no** está en `package.json`. `lib/ai/cache.ts` es Redis-ready solo de interfaz: si hay `AI_CACHE_URL`, emite warning y sigue en **memoria**.  
- **Por qué importa:** En multi-instancia (Vercel/varios workers) el caché no se comparte; se pagan tokens de más y hay inconsistencia.  
- **Dónde tocar:** `package.json`, `lib/ai/cache.ts` (implementar store Redis + `setAiCache` en bootstrap), `.env.example`.  
- **Criterio de hecho:** Con Redis up, hit/miss compartido entre procesos; sin Redis, fallback memoria documentado.  
- **Esfuerzo:** M  

#### P0.3 — Rate limit distribuido

- **Qué falta:** `lib/ai/rate-limiter.ts` usa `Map` en memoria del proceso. Los límites por plan (`FREE` 10/día, etc.) no son confiables con varias réplicas.  
- **Por qué importa:** Abuso de API / costos; planes FREE pueden superar el cupo real.  
- **Dónde tocar:** `lib/ai/rate-limiter.ts`, opcionalmente Redis (`AI_CACHE_URL` o store dedicado).  
- **Criterio de hecho:** Contadores consistentes entre instancias; tests de desborde por plan.  
- **Esfuerzo:** M  

#### P0.4 — Cron de insights no está programado en hosting

- **Qué falta:** Existe `app/api/ai/cron/insights/route.ts`, pero `vercel.json` **no** declara cron. Nadie lo dispara salvo llamada manual.  
- **Por qué importa:** Dashboard/analytics no se precalientan; UX fría y latencia alta.  
- **Dónde tocar:** `vercel.json` (o scheduler externo), `CRON_SECRET` en env de prod.  
- **Criterio de hecho:** Job diario/semanal visible en el host; logs `processed/ok/failed`.  
- **Esfuerzo:** S  

#### P0.5 — Secreto del cron por query string

- **Qué falta:** El cron acepta `?secret=` además de `Authorization: Bearer`. Eso acaba en logs de access/proxy.  
- **Por qué importa:** Riesgo de filtración del secret.  
- **Dónde tocar:** `app/api/ai/cron/insights/route.ts` — eliminar query param en prod o documentar solo Bearer.  
- **Criterio de hecho:** Solo header Bearer; 401 sin él.  
- **Esfuerzo:** S  

---

### P1 — Producto incompleto

#### P1.1 — Coach: tool-invoke SEO no crawlea competidores

- **Qué falta:** `COACH_TOOL_SPECS` admite `competitors`, pero en `maybeInvokeSpecialist` solo se hace `crawlSeoPage(url)` — **no** `crawlCompetitors`. La herramienta `/api/tools/seo-analyzer` sí los soporta.  
- **Por qué importa:** Desde el asistente, el análisis competitivo queda incompleto vs la herramienta dedicada.  
- **Dónde tocar:** `app/api/ai/assistant/route.ts`, `lib/ai/adapters/seo-crawl.ts`.  
- **Criterio de hecho:** Mensaje tipo “compará mi sitio X con Y” → crawl de ambos + `comparison` en la respuesta.  
- **Esfuerzo:** S  

#### P1.2 — Orquestación Coach = JSON router, no function-calling nativo

- **Qué falta:** Hay una pasada LLM con `jsonMode` (`buildCoachRouterMessages` / `parseCoachDecision`), no tools nativos del proveedor (OpenAI tools / Anthropic tools). Es frágil ante JSON malformado (fail-open a “answer”).  
- **Por qué importa:** Menos fiabilidad al delegar; más tokens (doble llamada).  
- **Dónde tocar:** `lib/ai/agents/coach-agent.ts`, `app/api/ai/assistant/route.ts`, providers.  
- **Criterio de hecho:** Tool-calling nativo o schema validado con reintentos; métrica de % invoke correcto.  
- **Esfuerzo:** L  

#### P1.3 — SEO “premium” (gap vs mega-spec)

- **Qué falta (honesto):** Hay crawl HTML + opc. PageSpeed + competidores (máx. 2) + campo `prediccion` etiquetado. **No** hay backlinks, keywords de mercado, SERP, crawl profundo multi-página, ni motor de predicción cuantitativo propio: la “predicción de crecimiento” es **texto del LLM** con supuestos, no un modelo de growth.  
- **Por qué importa:** El spec pedía nivel comparable a herramientas SEO premium.  
- **Dónde tocar:** `lib/ai/adapters/seo-crawl.ts`, `lib/ai/agents/seo-agent.ts`, UI en `app/herramientas/page.tsx`, posibles APIs externas.  
- **Criterio de hecho:** Métricas adicionales reales documentadas; predicciones con modelo/reglas explícitas y badges `prediccion` consistentes.  
- **Esfuerzo:** L  

#### P1.4 — PageSpeed / métricas reales opcionales

- **Qué falta:** Sin `GOOGLE_PAGESPEED_API_KEY`, el crawl marca PageSpeed como faltante (correcto), pero la UX “profesional completa” queda limitada.  
- **Por qué importa:** Scores de velocidad vacíos o heurísticos (`content`/`links` estimados).  
- **Dónde tocar:** `.env`, `lib/ai/adapters/seo-crawl.ts`, UI SEO.  
- **Criterio de hecho:** En prod con key, `loadTimeScore` poblado; UI aclara origen del dato.  
- **Esfuerzo:** S (config) / M (más Core Web Vitals).  

#### P1.5 — Streaming sin cadena de fallback

- **Qué falta:** `routeGenerate` prueba varios proveedores; `routeStream` usa **solo** el primario. Si AgentRouter cae, el chat SSE falla aunque haya Gemini/Anthropic.  
- **Por qué importa:** Asistente es lo más visible; un solo fallo tumba la UX.  
- **Dónde tocar:** `lib/ai/router.ts` (`routeStream`), `lib/ai/engine.ts`.  
- **Criterio de hecho:** Fallo del primario → stream desde el siguiente de la chain.  
- **Esfuerzo:** M  

#### P1.6 — Cron limitado y poco configurable

- **Qué falta:** Máx. 40 usuarios activos (14 días); siempre dashboard `weekly` + analytics `30d`. No hay cola, retries ni observabilidad de negocio.  
- **Por qué importa:** Escala y cobertura incompletas.  
- **Dónde tocar:** `app/api/ai/cron/insights/route.ts`.  
- **Criterio de hecho:** Paginación/cursor, períodos configurables, alertas de `failed`.  
- **Esfuerzo:** M  

#### P1.7 — Tipo `AiConversationType.TOOL` sin uso

- **Qué falta:** El enum incluye `TOOL`, pero solo se crean conversaciones `ASSISTANT`. No hay historial persistente por herramienta.  
- **Por qué importa:** Spec pedía memoria/historial más rico en tools.  
- **Dónde tocar:** `prisma/schema.prisma`, adaptadores de tools, UI.  
- **Criterio de hecho:** Al menos una tool guarda hilos `TOOL` reutilizables.  
- **Esfuerzo:** M  

#### P1.8 — Memoria larga: umbral alto y best-effort silencioso

- **Qué falta:** `maybeSummarizeConversation` solo corre con **>16** mensajes; errores se tragan. No hay UI que muestre “resumen activo”.  
- **Por qué importa:** Chats medianos no compactan; fallos de summary son invisibles.  
- **Dónde tocar:** `lib/ai/conversation-memory.ts`, opcional badge en `AiAssistantChat`.  
- **Criterio de hecho:** Summary verificable en BD tras N mensajes; telemetría de fallos.  
- **Esfuerzo:** S  

---

### P2 — Infra / proveedores

#### P2.1 — Observabilidad solo `console.log`

- **Qué falta:** `lib/ai/observability.ts` no integra APM, métricas ni tracing (tokens, latencia p95, fallbacks).  
- **Por qué importa:** Costos y SLOs a ciegas en prod.  
- **Dónde tocar:** `lib/ai/observability.ts` (+ sink OpenTelemetry / proveedor).  
- **Criterio de hecho:** Dashboard de eventos `generate_*`, `fallback`, `rate_limited`, `cache_hit`.  
- **Esfuerzo:** M  

#### P2.2 — Providers DeepSeek / Mistral / Groq / OpenRouter

- **Qué falta:** Están tipados y en la chain OpenAI-compatible, pero no hay env dedicadas ni defaults de base URL tan claros como AgentRouter/OpenAI. Requieren `AI_PROVIDER` + `AI_BASE_URL` + key genérica.  
- **Por qué importa:** Spec pedía multi-proveedor “plug and play”.  
- **Dónde tocar:** `lib/ai/config.ts`, `lib/ai/router.ts`, `.env.example`.  
- **Criterio de hecho:** Documentar y probar al menos un secundario end-to-end.  
- **Esfuerzo:** S–M  

#### P2.3 — Tests automatizados del motor IA

- **Qué falta:** No hay suite dedicada (router, rate-limit, parseCoachDecision, seo-crawl mocks, favoritos PATCH).  
- **Por qué importa:** Regresiones caras en prompts/agentes.  
- **Dónde tocar:** `lib/ai/**` + tests (Vitest/Jest según stack).  
- **Criterio de hecho:** CI verde con unit tests de parse/router/cache.  
- **Esfuerzo:** L  

#### P2.4 — Bootstrap de Redis al arranque

- **Qué falta:** Aunque se instale `ioredis`, no hay módulo de init que llame `setAiCache(...)` desde el entrypoint Next.  
- **Por qué importa:** La interfaz sola no activa Redis.  
- **Dónde tocar:** p. ej. `lib/ai/cache-redis.ts` + import en routes o instrumentation.  
- **Criterio de hecho:** Con `AI_CACHE_URL`, get/set van a Redis sin warning de “no hay cliente”.  
- **Esfuerzo:** S (tras P0.2)  

---

### P3 — Nice-to-have / futuro

#### P3.1 — Nivel SEMrush/Ahrefs / growth model propio

- Backlinks, keywords competitivas, SERP tracking, predicción numérica de tráfico.  
- **Esfuerzo:** L (producto nuevo, no polish).  

#### P3.2 — Wizard legal multi-paso real

- Hoy es un formulario rico + agente legal, no un wizard step-by-step con estado.  
- **Dónde:** `app/herramientas/page.tsx`, `lib/ai/agents/legal-agent.ts`.  
- **Esfuerzo:** M  

#### P3.3 — Alertas proactivas (email/push) desde insights

- Cron escribe caché; no notifica al usuario.  
- **Esfuerzo:** M–L  

#### P3.4 — UI del summary / indicador de tool invocada

- El SSE manda `meta.tool`, pero la UI del chat no destaca “usado: SEO / POS”.  
- **Dónde:** `components/ai/AiAssistantChat.tsx`.  
- **Esfuerzo:** S  

#### P3.5 — Borrar / renombrar conversaciones

- Favoritos sí; delete/rename de hilos no.  
- **Esfuerzo:** S  

#### P3.6 — Evaluaciones humanas / golden prompts por agente

- Dataset de prompts de regresión por agente (SEO, pricing, coach).  
- **Esfuerzo:** M  

---

## Ya implementado (referencia)

Checklist breve para no confundir hecho vs pendiente:

### Motor (`lib/ai/`)

- [x] Config multi-env (`config.ts`)  
- [x] Router con fallback en **generate** (`router.ts`)  
- [x] Providers: OpenAI-compatible, Anthropic (+ stream), Gemini, Ollama  
- [x] Engine + streaming SSE (`engine.ts`)  
- [x] Context manager, prompt builder, response formatter  
- [x] Loaders: user-context, tool-context, business-data (POS/analytics)  
- [x] Caché **en memoria** + interfaz Redis-ready (`cache.ts`)  
- [x] Rate limit **en memoria** por plan (`rate-limiter.ts`)  
- [x] Observabilidad por logs (`observability.ts`)  
- [x] Registro de agentes: seo, pricing, roi, legal, prompt-engineer, brand, retail-pos, analytics, coach  

### APIs

- [x] `POST/GET/PATCH /api/ai/assistant` — chat, historial, favoritos, coach invoke  
- [x] `GET /api/ai/insights` — dashboard + `AiInsightCache`  
- [x] `GET /api/ai/analytics` — patrones/anomalías + caché  
- [x] `POST /api/ai/pos-insights`  
- [x] `GET|POST /api/ai/cron/insights` (auth por secret; **sin schedule en vercel.json**)  
- [x] Tools con `enhanceWithAi` → agentes (`lib/ai/adapters/tool-enhance.ts`)  

### UI

- [x] `/asistente` + `AiAssistantChat` (stream, regenerar, continuar, export MD/PDF, copiar, favoritos ★)  
- [x] `DashboardAiInsights` (diario/semanal/mensual) + `AnalyticsAiPanel`  
- [x] POS reportes con `AiInsightCard`  
- [x] Herramientas: SEO (competidores UI + comparison + prediccion), pricing avanzado, ROI escenarios, contratos, 14 plataformas prompt, paletas con “Aplicar colores sugeridos”  
- [x] Componentes: `AiMarkdown`, `AiChecklist`, `DataBadge`, typing indicator, etc.  

### End-to-end (estado real)

| Feature | ¿Funciona E2E? | Nota |
|---------|----------------|------|
| Favoritos | **Sí** (código) | Requiere migración `favorite` aplicada |
| Summary / memoria larga | **Sí** (best-effort) | Solo si >16 msgs + IA OK; silencioso si falla |
| Coach tool-invoke | **Sí** | Invoke funciona; SEO crawlea competidores y compara |
| Redis cache | **Sí** | Con cliente `ioredis` y RedisAiCache habilitado |
| Cron hosted | **Sí** | Endpoint seguro (solo Bearer) y programado en vercel.json |

---

## Variables de entorno relacionadas

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `AI_PROVIDER` | No (default `agentrouter`) | Proveedor primario |
| `AI_BASE_URL` | No (default AgentRouter) | Base OpenAI-compatible |
| `AI_API_KEY` | **Sí** para IA útil | Auth del primario (o fallbacks) |
| `AI_MODEL` | No (default `gpt-5.5`) | Modelo primario |
| `OPENAI_API_KEY` | No | Fallback / alias de key |
| `ANTHROPIC_API_KEY` | No | Provider Anthropic + chain |
| `ANTHROPIC_MODEL` | No | Default Claude 3.5 Sonnet |
| `GEMINI_API_KEY` | No | Provider Gemini nativo |
| `GEMINI_MODEL` | No | Default `gemini-2.0-flash` |
| `OLLAMA_BASE_URL` | No | Ollama local |
| `OLLAMA_MODEL` | No | Modelo Ollama |
| `GOOGLE_PAGESPEED_API_KEY` | No | Score real SEO |
| `AI_CACHE_URL` | No | Reservada Redis; **hoy no activa cliente** |
| `CRON_SECRET` | Sí para cron | Bearer del endpoint cron |

---

## Migraciones Prisma relacionadas

### `20260726120000_ai_conversations`

- Enum `AiConversationType` (`ASSISTANT`, `TOOL`)  
- Tabla `AiConversation`: `id`, `userId`, `type`, `title`, `createdAt`, `updatedAt`  
- Tabla `AiMessage`: `id`, `conversationId`, `role`, `content`, `createdAt`  
- Tabla `AiInsightCache`: `id`, `userId`, `scope`, `period`, `payload`, `expiresAt`, `createdAt`  
- Índices y unique `(userId, scope, period)` en caché  

### `20260726150000_ai_agent_upgrades`

- `AiConversation.summary` — `TEXT` nullable (memoria larga)  
- `AiConversation.favorite` — `BOOLEAN NOT NULL DEFAULT false`  

Modelo actual en `prisma/schema.prisma` (campos clave):

```prisma
model AiConversation {
  // ...
  summary   String?
  favorite  Boolean @default(false)
  // ...
}
```

---

## Notas de seguridad

1. **Nunca** commitear `.env` con claves reales. `.env.example` debe mantener `AI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` **vacíos**.  
2. Si alguna key de AgentRouter/OpenAI apareció en git o en un chat, **rotarla** en el proveedor.  
3. Preferir `Authorization: Bearer <CRON_SECRET>` y **no** pasar el secret por query string en producción.  
4. El asistente tiene guardrails (heurística + clasificación LLM en zona gris) con **fail-open** hacia “on-topic”: revisar si en prod conviene fail-closed.  
5. Rate limits en memoria no protegen bien el presupuesto de tokens en clusters.  
6. Respuestas legales del agente deben seguir mostrando el disclaimer (`LEGAL_DISCLAIMER` en `lib/ai/constants.ts`): no es asesoría jurídica.

---

## Mapa rápido de archivos

```
lib/ai/
  engine.ts, router.ts, config.ts, cache.ts, rate-limiter.ts
  agents/          # 9 agentes + registry + run-agent
  providers/       # openai-compatible, anthropic, gemini, ollama
  adapters/        # seo-crawl, tool-enhance, contract-fallback
app/api/ai/
  assistant/       # Coach + favoritos + SSE
  insights/        # Dashboard
  analytics/       # Motor analíticas
  pos-insights/
  cron/insights/
components/ai/     # Chat, panels, markdown, badges
app/herramientas/page.tsx
app/asistente/page.tsx
prisma/migrations/202607261*
```

---

*Última auditoría de código: 2026-07-26. Actualizar este doc cuando se cierre un P0/P1.*
