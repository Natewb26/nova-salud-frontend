# Nova Salud - Frontend

Sistema web de gestión farmacéutica desarrollado con React y Vite.

Este repositorio contiene exclusivamente el frontend de Nova Salud.
La API REST y la base de datos son desarrolladas por separado y se
integrarán posteriormente.

## Tecnologías

- React 19
- Vite
- React Router
- Tailwind CSS 4
- Axios
- Lucide React

## Requisitos

- Node.js compatible con la versión de Vite instalada.
- npm.

## Instalación

Clonar el repositorio y entrar en su carpeta:

```bash
git clone URL_DEL_REPOSITORIO
cd frontend
npm install
```

Crear el archivo de configuración local:

```bash
cp .env.example .env
```

En Windows PowerShell también se puede utilizar:

```powershell
Copy-Item .env.example .env
```

## Configuración

Editar `.env` según el entorno.

| Variable | Descripción |
|---|---|
| VITE_API_URL | URL base de la API REST, por ejemplo `http://localhost:3000` |
| VITE_DATA_MODE | `api` para consumir la API real o `demo` para usar datos locales |

Para trabajar sin el backend, utiliza:

```env
VITE_API_URL=http://localhost:3000
VITE_DATA_MODE=demo
```

Reinicia Vite después de modificar `.env`.

## Ejecución en desarrollo

```bash
npm run dev
```

Abre la dirección exacta que Vite muestra en la terminal. Normalmente será
`http://localhost:5173/`; si ese puerto ya está ocupado, Vite utilizará otro.

## Acceso de demostración

Con `VITE_DATA_MODE=demo` y ejecutando la aplicación en desarrollo:

- Correo: admin@novasalud.test
- Contraseña: NovaSalud2026!

Los datos de demostración se almacenan localmente en el navegador.

El modo demo no debe considerarse un mecanismo de autenticación para
producción.

## Validación y compilación

Comprobar el código:

```bash
npm run lint
```

Generar la compilación:

```bash
npm run build
```

Previsualizar la compilación:

```bash
npm run preview
```

## Módulos

- Dashboard
- Productos
- Categorías
- Proveedores
- Clientes
- Inventario
  - Stock
  - Lotes
  - Movimientos (Kardex)
  - Alertas
- Compras
- Ventas
- Pagos
- Devoluciones
- Reportes

## Arquitectura

La interfaz está organizada en páginas, componentes, contextos y
servicios. Los servicios centralizan el acceso a los datos para
facilitar la integración posterior con la API REST.

El almacenamiento de demostración utiliza datos locales del navegador.

## Alcance del repositorio

Este proyecto contiene únicamente el frontend.

El backend y la base de datos se mantienen en proyectos y
repositorios independientes.
