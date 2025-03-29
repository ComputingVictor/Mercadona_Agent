# ¿Qué hay en el súper?

Este proyecto consiste en una aplicación web que muestra un catálogo de productos de supermercado, permitiendo realizar búsquedas, filtrar por categorías, agregar favoritos, ver información de macronutrientes y mucho más. Además, se incluyen *notebooks* de análisis de datos para procesar la información de productos y visualizar distintos aspectos de los mismos.

Puedes visitar la aplicación en funcionamiento aquí:  
[**https://computingvictor.github.io/Mercadona_Agent/**](https://computingvictor.github.io/Mercadona_Agent/)

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)  
2. [Características Principales](#características-principales)  
3. [Estructura del Proyecto](#estructura-del-proyecto)  
4. [Tecnologías Utilizadas](#tecnologías-utilizadas)  
5. [Cómo Ejecutar el Proyecto](#cómo-ejecutar-el-proyecto)  
6. [Uso de la Aplicación Web](#uso-de-la-aplicación-web)  
7. [Notas sobre el Análisis de Datos](#notas-sobre-el-análisis-de-datos)  
8. [Contribución](#contribución)  
9. [Licencia](#licencia)

---

## Descripción General

La idea de este proyecto es facilitar la consulta y exploración de productos de supermercado. Cuenta con una interfaz web responsiva que permite:

- Buscar productos por nombre.
- Filtrar productos por categorías.
- Ordenar los resultados por nombre o precio.
- Paginación configurable.
- Gestión de favoritos.
- Visualización de información nutricional.
- Tema claro/oscuro.

También se incluyen notebooks en Jupyter para análisis y procesamiento de los datos.

---

## Características Principales

- Búsqueda en tiempo real.
- Filtrado por categoría.
- Listado y gestión de favoritos.
- Ordenación por nombre o precio.
- Paginación ajustable.
- Modal para ver información nutricional (macros).
- Tema claro y oscuro.
- Interfaz responsive.

---

## Estructura del Proyecto

\`\`\`
.
├── 01_Init_Project.ipynb
├── 02_Products_Analysis.ipynb
├── 03_data_analysis_visualizations.ipynb
├── data/
│   └── processed/
│       └── products_macro.csv
├── index.html
├── script.js
├── style.css
├── pyproject.toml
├── uv.lock
└── README.md
\`\`\`

---

## Tecnologías Utilizadas

**Frontend:**
- HTML5 + CSS3
- JavaScript (Vanilla)
- PapaParse
- LocalStorage

**Backend/Data:**
- Python
- Pandas, Numpy, Matplotlib
- Jupyter Notebook
- Poetry (pyproject.toml)

---

## Cómo Ejecutar el Proyecto

1. Clonar el repositorio:
\`\`\`bash
git clone https://github.com/ComputingVictor/Mercadona_Agent.git
\`\`\`

2. Instalar dependencias (opcional):
\`\`\`bash
cd Mercadona_Agent
poetry install
\`\`\`

3. Lanzar servidor local:
\`\`\`bash
python -m http.server
\`\`\`

4. Abrir notebooks:
\`\`\`bash
jupyter notebook
\`\`\`

---

## Uso de la Aplicación Web

1. Buscar productos
2. Filtrar por categorías
3. Ordenar productos
4. Paginación
5. Añadir/eliminar favoritos
6. Visualizar macros
7. Cambiar entre modo claro y oscuro

---

## Notas sobre el Análisis de Datos

Los notebooks contienen:
- Extracción y limpieza de datos
- Análisis exploratorio y visualización
- Exportación a CSV procesado para la web

---

## Contribución

1. Haz un fork del proyecto.
2. Crea una rama para tus cambios.
3. Abre un pull request.

---

¡Gracias por tu interés en "¿Qué hay en el súper?"!

Repo: [https://github.com/ComputingVictor/Mercadona_Agent](https://github.com/ComputingVictor/Mercadona_Agent)
