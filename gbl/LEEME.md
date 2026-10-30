# Hangar de Modelos

Visor web (Three.js) de modelos GLB guardados como texto.

## Cómo abrirlo
Los navegadores no dejan leer archivos con doble clic (file://), así que sirve la carpeta:

    python -m http.server 8000

y abre http://localhost:8000. También funciona subiendo la carpeta tal cual a cualquier hosting
(por ejemplo, dentro de tu WordPress en una carpeta /hangar/).

## Formato de los .txt (AGZ1)
`AGZ1:` + base64( gzip( GLB optimizado ) ).
El GLB optimizado lleva texturas en WebP y geometría cuantizada (KHR_mesh_quantization),
más un filtro delta reversible que el visor deshace al cargar. Error de posición < 0,001 % del tamaño del modelo.

## Añadir más modelos
1. Convierte:  `python convertir_glb_a_txt.py MiModelo.glb models`
   (necesita Python 3 con `pip install numpy pillow`; crea también una copia .glb en ../glb_opt,
   puedes borrarla).
2. Añade una entrada al bloque `<script type="application/json" id="catalogo">` de index.html:
   `{"id":"mi-modelo","titulo":"Mi modelo","version":"v1","tipo":"coche","archivo":"models/MiModelo.txt","bytesOriginal":0,"bytesTxt":0,"animaciones":0}`
   (tipo: coche, avion, barco o casa; los bytes solo sirven para mostrar tamaños).

Sin convertir nada, el botón «Añadir modelo» del visor abre cualquier .glb o .txt para verlo al momento.
