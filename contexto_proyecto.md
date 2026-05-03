Descripción General:
Este proyecto consiste en el desarrollo de una solución integral de monitoreo de condición para motores de corriente alterna (AC). El sistema captura señales de vibración en tiempo real, las procesa y las visualiza en una interfaz gráfica de alto rendimiento, permitiendo tanto el diagnóstico preventivo en vivo como el análisis forense de datos históricos.

Arquitectura de Hardware y Comunicación:

Sensor/Controlador: Basado en el chip ESP8266.

Adquisición: El controlador captura datos de aceleración (Vibración RMS y señales filtradas por ejes) a una tasa de aproximadamente 200 Hz.

Protocolo de Comunicación: Los datos se transmiten de forma inalámbrica mediante WebSockets (servidor alojado en el ESP8266 en modo Access Point o estación local) para garantizar una latencia mínima.

Evolución Tecnológica (Migración):
El proyecto está migrando de una interfaz inicial basada en Python (Matplotlib) hacia un ecosistema de Tecnologías Web Modernas para lograr una aplicación multiplataforma (.exe para Windows y .apk para Android).

Stack Tecnológico Seleccionado:

Backend (Puente de Datos): Node.js. Encargado de la gestión de WebSockets, procesamiento de archivos y lógica de servidor local.

Almacenamiento de Datos (Persistencia): SQLite. Se utiliza para manejar el alto volumen de datos (aprox. 12,000 registros por minuto) de manera indexada, permitiendo consultas instantáneas de históricos.

Frontend (Interfaz Visual): HTML5, CSS (Tailwind) y JavaScript (ES6+).

Visualización Gráfica: Librerías de alto rendimiento basadas en Canvas/WebGL (como uPlot o LightningChart JS) para renderizar señales tipo osciloscopio a 60 FPS.

Empaquetado Multiplataforma: Tauri (para escritorio Windows) y Capacitor (para dispositivos móviles Android).

Funcionalidades Críticas a Implementar:

Modo Real-Time: Visualización fluida de la vibración con desacople entre la tasa de recepción (200Hz) y la tasa de refresco visual (60fps) para evitar saturación de CPU.

Modo Playback (Histórico): Capacidad de consultar la base de datos SQLite para reproducir ráfagas de tiempo pasadas, con controles de velocidad de reproducción (x1, x2, pausa) y sliders de navegación temporal.

Gestión de Archivos: Opción para que el usuario seleccione el directorio de almacenamiento de la base de datos.

Exportación de Datos: Herramienta para filtrar rangos de tiempo específicos en la base de datos y exportarlos a formato CSV para análisis externo.

Análisis ISO 2372: Implementación visual de umbrales de severidad vibratoria (zonas verde, amarilla, naranja, roja) sobrepuestas en las gráficas de señal filtrada.

Objetivo de este Contexto:
Servir como base de conocimiento para asistir en la generación de código, resolución de errores de arquitectura y optimización de la comunicación entre el backend de Node.js y la interfaz de usuario, garantizando siempre la mayor fidelidad de los datos de vibración recibidos del controlador ESP8266.