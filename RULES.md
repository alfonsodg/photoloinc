# Firebase #BuildHybridAI 2026 — Rules & Details

- **URL**: https://firebasehybridaihackathon.devpost.com/
- **Rules**: https://firebasehybridaihackathon.devpost.com/rules
- **Hosts**: Google · managed by Devpost
- **Submissions**: 9–30 Nov 2026 → **deadline 30 Nov 2026, 14:00 PST** (= 17:00 EST)
- **Prize**: **$30,000** cash
- **Format**: Online, público
- **Cost**: Free
- **Participants**: **5,023** al 24 nov 2026

> Nota: hacklist.io lista este evento con "$10,000" y "prize split not out yet".
> **Ambos datos están obsoletos.** La página oficial de Devpost publica $30,000 y el
> desglose completo. Este documento sigue a Devpost.

## El reto

Los modelos on-device son rápidos, privados y gratis de correr, pero **no están en todos
los dispositivos**. Construir apps que usen ambos: `Firebase AI Logic Hybrid Inference SDK`
corre el prompt en el dispositivo cuando hay modelo local disponible y **cae a la nube**
cuando no lo hay.

### Plataformas válidas (elegir al menos una)

| plataforma | modelo local |
|---|---|
| **Web (Chrome)** — web app o extensión de Chrome | Gemini Nano 4 vía Firebase AI Logic |
| **Android** | Gemini Nano 4 vía Firebase AI Logic |
| **iOS** | Apple Foundation Models API, ejecución local vía Firebase AI Logic |

**Multiplataforma recibe consideración fuerte para el Grand Prize** — es donde un SDK
híbrido único realmente se luce. Pero una app sobresaliente de una sola plataforma
también puede ganar.

Ejemplo textual del organizador: una app de notas que resume on-device sin conexión y
entrega documentos largos a la nube.

## Premios — desglose verificado

| premio | monto | extras |
|---|---|---|
| Grand Prize | $10,000 | entrevista + blog post de Firebase + mención en redes |
| 1st Runner Up | $7,000 | entrevista + blog post + mención |
| 2nd Runner Up | $4,000 | mención en redes |
| Best iOS App | $3,000 | mención en redes |
| Best Android App | $3,000 | mención en redes |
| Best Web/Chrome App | $3,000 | mención en redes |

Suma: 10 + 7 + 4 + 3 + 3 + 3 = **$30,000**. Cuadra.

## Criterios de juicio (4, sin pesos publicados)

| criterio | qué mide |
|---|---|
| Technological Implementation | qué tan bien construido y qué tan efectivamente usa **hybrid inference de Firebase AI Logic** como parte de la solución |
| Design | experiencia de producto completa y coherente, no solo una prueba técnica de concepto |
| Potential Impact | caso creíble y específico de un problema real para una audiencia real, y que la solución lo aborde según lo demostrado |
| Quality of the Idea | uso creativo y no obvio de Firebase AI Logic, con comprensión genuina del problema |

Jueza: **Ankita Saxena**.

## Elegibilidad — verificado

- Mayores de edad en su país de residencia.
- Individual, equipo u organización.
- **Perú SÍ es elegible.** Países/territorios excluidos: Bielorrusia, Brasil, Crimea, Cuba,
  Irán, **Italia**, Corea del Norte, **Quebec**, Rusia, Sudán y Siria.
- **Proyectos nuevos y apps existentes significativamente actualizadas** son elegibles.
- Se admiten múltiples proyectos si cada uno es sustancialmente distinto.
- Todos los materiales en inglés (el video puede llevar subtítulos en inglés).
- El proyecto debe estar disponible **gratis**.

## Qué entregar

1. **Al menos una plataforma** seleccionada (Web/Chrome, Android o iOS). El sponsor puede reasignar
   la categoría.
2. **Descripción en texto** con: cómo se usó Firebase AI Logic, resumen de features y
   funcionalidad, y la propuesta de valor.
3. **URL del repo público** en GitHub o GitLab, con código, assets e instrucciones. Debe
   **demostrar el uso de Firebase AI Logic en runtime** — importado y **realmente llamado**
   (un import de librería, un entry point de app o backend, o una config de agente/flujo/MCP
   cargada). **No basta con nombrarlo en el README.**
4. **Licencia open source** detectable y visible en la sección About del repo. Apache es la
   preferida, pero vale cualquiera.
5. **Video de demostración de máximo 3 minutos**, público en YouTube, con el proyecto
   funcionando en la(s) plataforma(s) para la(s) que fue construido. Si dura más, **solo se
   evalúan los primeros 3 minutos**.
6. **URL del proyecto desplegado** — muy recomendada, no obligatoria. Web UI, extensión de
   Chrome, app móvil.
7. Si la app existía antes del periodo de submission: resumen de qué se construyó durante el
   periodo; y si ya tenía uso público, el valor que aporta al nuevo proyecto y qué tan usada fue.

## Google Account Quota — la fecha límite escondida

Las cuotas gratis de Firebase AI Logic cubren **text inference** dentro de límites. Para
features avanzados — **generación de imágenes**, mayor acceso a los modelos — hay que pedir
un **Google Account Quota**.

- Cada cuenta vale **4 días** desde que se emite.
- Una por entrante, por proyecto, por sprint. Se puede re-aplicar en un sprint posterior.
- No están garantizadas; Google las aprueba a discreción.
- **Los pedidos abren cada lunes.**

| sprint | pedir antes de | cuenta enviada |
|---|---|---|
| Sprint 1 | mié 11 nov, 12:00 AM PT | jue 12 nov |
| Sprint 2 | mié 18 nov, 10:00 AM PT | jue 19 nov |
| **Sprint 3 (final)** | **mié 25 nov, 10:00 AM PT** | **vie 27 nov** |

**El Sprint 3 es la última ventana y cierra el 25 nov a las 10:00 AM PT** — cinco días antes
del deadline, y dos días antes de que llegue la cuenta. Cualquier solución multiplataforma
que necesite generación de imágenes depende de pedirla ese día.

Formulario: https://forms.gle/uPcDhaYW3iVo2AYw5

## Obligatorio técnico

- **Firebase AI Logic requiere App Check.** Los *debug tokens* se aceptan en la submission.
- Se recomienda usar otros productos de Firebase: **Remote Config, Firestore, Authentication,
  AppCheck**.
- Se puede construir con **cualquier herramienta o IDE de IA** — Antigravity, Android Studio,
  Claude Code, Codex, Cursor — siempre que la IA de la app corra sobre Firebase AI Logic.
- Los **Firebase Agent Skills** vienen integrados en Antigravity y Android Studio.

## Evaluación honesta para este perfil

**A favor:**
- **$30,000 en 6 premios**, no solo uno: hay $3,000 específicos por plataforma. Competir por
  "Best Web/Chrome" es una carrera más corta que la del Grand Prize.
- Perú elegible, sin restricción de residencia.
- **Text inference es gratis dentro de límites** — se puede empezar hoy sin gastar.
- Apps existentes significativamente actualizadas son elegibles: no hay que empezar de cero.
- Cualquier agente de código sirve, y tenemos Claude Code.
- Permite hasta 3 minutos de video, sin requisito de originalidad absoluta.

**En contra:**
- **5,023 participantes** — la mayor competencia del tracker. ~1 premio por cada 840 personas.
- **15 días de ventana** (9–30 nov) y ya estamos en el día 15: quedan **6 días**.
- Gemini Nano 4 y Apple Foundation Models son **modelos on-device**; el híbrido es el punto
  del hackathon y no se puede simular. Una app solo-nube no cumple.
- El juicio exige ver AI Logic **llamada en runtime**, no importada.
- La generación de imágenes depende de una cuota que hay que pedir antes del 25 nov.
- Compite con gente que ya tiene apps publicadas que puede "actualizar significativamente".

**Veredicto:** activa, pero es la entrada con **menor relación premio/competencia** de todo el
tracker y **6 días** de margen. La ruta sensata, si se entra, es **Best Web/Chrome App
($3,000)** con una web app o extensión de Chrome — es la plataforma con menor fricción
(no hace falta emulador Android ni Mac para iOS) y un premio dedicado a la que menos gente
apuntará. El Grand Prize de $10,000 está fuera de alcance en 6 días.

## Notes

- No es pago, ni crypto. IA móvil/web — encaja en el filtro.
- El organizador es Google, con Devpost como administrador.
- Discord de Devpost con `#hackathon-help` para dudas y compañeros de equipo.
