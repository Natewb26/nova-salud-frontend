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
| VITE_API_URL | URL base de la API REST |
| VITE_DEMO_AUTH | Habilita autenticación demo durante desarrollo |
| VITE_DEMO_DATA | Habilita datos locales demo durante desarrollo |

La URL de la API se completará cuando se realice la integración
con el backend.

## Ejecución en desarrollo

```bash
npm run dev
```

## Acceso de demostración

Con `VITE_DEMO_AUTH=true` y ejecutando la aplicación en desarrollo:

- Correo: admin@novasalud.test
- Contraseña: NovaSalud2026!

Los datos de demostración se almacenan localmente en el navegador.

El modo demo está limitado al entorno de desarrollo. No debe
considerarse un mecanismo de autenticación para producción.

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
