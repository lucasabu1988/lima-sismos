# Sismo Perú

Dashboard en tiempo real de la actividad sísmica en **todo el Perú**: costa, sierra, selva y fosa de Nazca. Lima queda como un recorte, no como el marco del tablero.

No es un sistema de alerta oficial. Cruza fuentes públicas y las enseña en hora de Lima.

## Fuentes

| Fuente | Qué aporta | Endpoint |
| --- | --- | --- |
| **IGP / CENSIS** | Último sismo oficial de Perú, catálogo anual e intensidad | `https://ultimosismo.igp.gob.pe/api/ultimo-sismo` y `/api/ultimo-sismo/ajaxb/{año}` |
| **USGS** | Catálogo FDSN de todo el territorio peruano y la fosa (confirma eventos M≥2.5–4) | [Earthquake Catalog API](https://earthquake.usgs.gov/fdsnws/event/1/) |
| **IGP / CENVUL** | Volcanes vigilados, semáforo de alerta, sismos volcánicos y cámaras | `https://cenvul.igp.gob.pe/backend/api/volcanoes` y `/latest-information` |
| **PTWC / NOAA** | Boletines de tsunami del Pacífico (warning, watch, advisory, information) | `https://www.tsunami.gov/events/xml/PHEBAtom.xml` |
| **NGL / GNSS** | Series de desplazamiento de estaciones peruanas (IGS20 tenv3) | Nevada Geodetic Laboratory |
| **IRIS / FDSN** | Espectro de banda ancha de una estación pública (FFT sobre timeseries) | `https://service.iris.edu/irisws/timeseries/1/` |

El IGP suele reportar sismos peruanos más chicos y más rápido. Si ambas agencias publican el mismo evento, el tablero se queda con el IGP.

## Cómo correrlo

Hace falta Node 20+.

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

El servidor de Vite hace de proxy hacia el IGP, CENVUL, PTWC e IRIS porque esas APIs no envían cabeceras CORS. El USGS se consulta directo desde el navegador.

## Qué mide

- **Todo el Perú**: catálogo IGP + USGS del territorio y la fosa.
- **Norte / Centro / Sur / Oriente**: recortes regionales.
- **Fosa**: solo epicentros mar adentro.
- **Lima**: Callao–Cañete, el recorte original del observatorio.
- **Instrumentos**: GNSS costero y espectro de estación sísmica.
- **Estadística**: estacionalidad mensual (M≥4, M>6, M≥7) y correlaciones con índices climáticos.

También verás magnitud en el tiempo, un corte de profundidad oeste→este (la placa de Nazca hundiéndose) y un índice de actividad comparado con los últimos 90 días.

## Aviso

Un tablero no reemplaza al IGP, INDECI ni a la DHN. Las alertas de tsunami las confirma la **DHN** y el **PTWC**. Para emergencias usa la app **Sismos Perú** y los canales oficiales.
