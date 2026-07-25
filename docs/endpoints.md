# Documentación de Endpoints


## 1. Órdenes de Compra (Shopping)

### **Compartir Orden de Compra por Correo**
- **Endpoint:** `GET /shopping/share/{id}`
- **Descripción:** Envía la orden de compra por correo electrónico al proveedor asociado.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la orden de compra.
- **Respuestas:**
  - `201 Created`: Correo enviado exitosamente. Retorna un objeto con `message` y `title`.
  - `404 Not Found`: Orden de compra no encontrada.
  - `500 Internal Server Error`: Error al enviar el correo.

### **Ver Detalles de Orden de Compra Pública**
- **Endpoint:** `GET /shopping/details/{token}`
- **Descripción:** Obtiene los detalles de una orden de compra usando un token público (no requiere autenticación). Este endpoint es de acceso público.
- **Seguridad:** Ninguna.
- **Parámetros:**
  - `token` (string, path, requerido): El token público de la orden de compra enviado al proveedor.
- **Respuestas:**
  - `200 OK`: Retorna los detalles de la orden de compra.
  - `404 Not Found`: Orden de compra no encontrada.

---

## 2. Hojas de Entrada de Servicios (HES)

### **Enviar HES por Correo**
- **Endpoint:** `POST /service-entry-sheets/send-email/{id}`
- **Descripción:** Envía un correo con un enlace público para que el cliente/proveedor pueda revisar la hoja de entrada de servicios.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la hoja de entrada de servicios (HES).
- **Cuerpo de la Petición (Opcional):**
  - `email` (string, formato email): Correo de destino opcional. Si no se envía, se utiliza el correo del cliente/proveedor por defecto.
  ```json
  {
    "email": "cliente@empresa.com"
  }
  ```
- **Respuestas:**
  - `200 OK`: Correo enviado correctamente.
  - `400 Bad Request`: No existe correo de destino especificado.
  - `404 Not Found`: HES no encontrada.
  - `500 Internal Server Error`: Error al enviar el correo.

### **Ver HES Pública por Token**
- **Endpoint:** `GET /service-entry-sheets/view/{token}`
- **Descripción:** Obtiene la HES serializada para consumo desde el enlace público enviado por correo.
- **Seguridad:** Ninguna.
- **Parámetros:**
  - `token` (string, path, requerido): El token público generado para revisar la HES.
- **Respuestas:**
  - `200 OK`: Retorna los datos de la HES (número, dirección, fecha de emisión, monto neto total, etc.).

---

## 3. Ventas

### **Enviar Venta por Correo**
- **Endpoint:** `POST /sales/send-email/{id}`
- **Descripción:** Envía un correo al cliente con un enlace público para que pueda revisar la venta/factura.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la venta.
- **Cuerpo de la Petición (Opcional):**
  - `email` (string, formato email): Correo de destino opcional. Si no se envía, se utiliza el correo del cliente por defecto.
  ```json
  {
    "email": "cliente@empresa.com"
  }
  ```
- **Respuestas:**
  - `200 OK`: Correo enviado correctamente.
  - `400 Bad Request`: No existe correo de destino especificado.
  - `404 Not Found`: Venta no encontrada.
  - `500 Internal Server Error`: Error al enviar el correo.

### **Ver Venta Pública por Token**
- **Endpoint:** `GET /sale/view/{token}`
- **Descripción:** Obtiene la venta serializada para consumo desde el enlace público enviado por correo.
- **Seguridad:** Ninguna.
- **Parámetros:**
  - `token` (string, path, requerido): El token público generado para revisar la venta.
- **Respuestas:**
  - `200 OK`: Retorna los datos de la venta pública.
  - `400 Bad Request`: Token inválido.
  - `404 Not Found`: Venta no encontrada.

---

## 4. Cuentas por Cobrar (Receivables)

### **Obtener Cuentas por Cobrar**
- **Endpoint:** `POST /dashboard/receivables`
- **Descripción:** Obtiene las cuentas por cobrar agrupadas por cliente, incluyendo presupuestos pendientes y ventas no pagadas.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Cuerpo de la Petición:**
  - `businessId` (integer, requerido): ID del negocio.
  ```json
  {
    "businessId": 1
  }
  ```
- **Respuestas:**
  - `200 OK`: Lista de cuentas por cobrar agrupada por cliente.

### **Resumen de Cuentas por Cobrar**
- **Endpoint:** `POST /dashboard/receivables/overview`
- **Descripción:** Obtiene un resumen ligero de cuentas por cobrar (solo información del cliente y deuda total), con paginación.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Cuerpo de la Petición:**
  - `businessId` (integer, requerido): ID del negocio.
  - `page` (integer, opcional): Número de página (por defecto: 1).
  - `perPage` (integer, opcional): Cantidad por página (por defecto: 5).
  ```json
  {
    "businessId": 1,
    "page": 1,
    "perPage": 5
  }
  ```
- **Respuestas:**
  - `200 OK`: Resumen ligero de cuentas por cobrar paginado.

---

## 5. Cuentas Contables (Ledging Accounts)

### **Obtener Cuentas Contables**
- **Endpoint:** `GET /ledging-accounts`
- **Descripción:** Obtiene las cuentas contables (paginadas opcionalmente).
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros de Consulta (Query):**
  - `page` (integer, opcional): Número de página.
  - `perPage` (integer, opcional): Cantidad por página.
  - `text` (string, opcional): Búsqueda por nombre de cuenta.
  - `type` (enum, opcional): Tipo de cuenta contable (`income`, `expense`, o `mixed`).
- **Respuestas:**
  - `200 OK`: Lista paginada o completa de cuentas contables.
  - `500 Internal Server Error`: Error interno al obtener las cuentas.

### **Crear Cuenta Contable**
- **Endpoint:** `POST /ledging-accounts/store`
- **Descripción:** Crea una nueva cuenta contable.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Cuerpo de la Petición:**
  - `name` (string, requerido): Nombre de la cuenta.
  - `type` (enum, requerido): Tipo de cuenta (`income`, `expense`, o `mixed`).
  - `businessId` (integer, requerido): ID del negocio.
  ```json
  {
    "name": "Servicios Básicos",
    "type": "expense",
    "businessId": 1
  }
  ```
- **Respuestas:**
  - `201 Created`: Cuenta contable creada exitosamente.
  - `500 Internal Server Error`: Error al crear la cuenta.

### **Ver Detalle de Cuenta Contable**
- **Endpoint:** `GET /ledging-accounts/show/{id}`
- **Descripción:** Obtiene los detalles de una cuenta contable específica.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la cuenta contable.
- **Respuestas:**
  - `200 OK`: Datos de la cuenta contable.
  - `404 Not Found`: Cuenta contable no encontrada.

### **Actualizar Cuenta Contable**
- **Endpoint:** `PUT /ledging-accounts/update/{id}`
- **Descripción:** Actualiza los datos de una cuenta contable existente.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la cuenta contable.
- **Cuerpo de la Petición (Opcional):**
  - `name` (string, opcional): Nombre de la cuenta.
  - `type` (enum, opcional): Tipo de cuenta (`income`, `expense`, o `mixed`).
  ```json
  {
    "name": "Servicios Básicos Actualizados",
    "type": "mixed"
  }
  ```
- **Respuestas:**
  - `200 OK`: Cuenta actualizada exitosamente.
  - `500 Internal Server Error`: Error al actualizar.

### **Eliminar Cuenta Contable**
- **Endpoint:** `DELETE /ledging-accounts/delete/{id}`
- **Descripción:** Elimina una cuenta contable.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros:**
  - `id` (integer, path, requerido): El ID de la cuenta contable.
- **Respuestas:**
  - `200 OK`: Cuenta eliminada correctamente.
  - `500 Internal Server Error`: Error al eliminar la cuenta.

### **Seleccionar Cuentas Contables**
- **Endpoint:** `GET /ledging-accounts/select`
- **Descripción:** Obtiene una lista ligera de cuentas contables para selectores/dropdowns.
- **Seguridad:** Requiere Autenticación (Bearer Token).
- **Parámetros de Consulta (Query):**
  - `type` (enum, opcional): Filtrar por tipo de cuenta (`income`, `expense`, o `mixed`).
- **Respuestas:**
  - `200 OK`: Lista de cuentas contables formateada como opciones (`{ text: "nombre", value: id }`).
  - `500 Internal Server Error`: Error interno.
