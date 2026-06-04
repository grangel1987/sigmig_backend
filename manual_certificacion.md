









## MANUAL PARA EMPRESAS USUARIAS





## AMBIENTE DE CERTIFICACIÓN

## FACTURA ELECTRONICA



## Fecha Documento: 2 Febrero 2009







©2009 Servicio de Impuestos Internos SII – Chile














## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 2 de 29
## REGISTRO DE CAMBIOS:

26 de Noviembre 2003.
Se incorpora paso de Intercambio de documentos en certificación de contribuyentes.

2 de Febrero 2009.
Corrección en descripción etapa de Documentos Impresos

Actualización del orden de las etapas de Intercambio y Documentos Impresos.







## TABLA DE CONTENIDOS


- DATOS DE LA EMPRESA .............................................................................................. 4
1.1 USUARIOS AUTORIZADOS................................................................................... 5
- AMBIENTE DE CERTIFICACIÓN ................................................................................ 5
2.1 AGREGAR USUARIOS ............................................................................................ 6
2.1 AGREGAR USUARIOS ............................................................................................ 7
2.2 SOLICITUD DE TIMBRAJE ELECTRONICO .................................................... 9
2.3 ENVÍO DE DOCUMENTOS .................................................................................. 12
2.4 CONSULTA DE ENVÍOS ....................................................................................... 14
2.5 OTRAS OPCIONES ................................................................................................ 15
- DOCUMENTOS TRIBUTARIOS ELECTRONICOS (DTE) ....................................... 17
3.1 Estructura de un DTE .............................................................................................. 17
3.2 Proceso de Validación .............................................................................................. 18
VALIDAR SCHEMA .................................................................................................. 19
VALIDAR FIRMA DIGITAL ..................................................................................... 19
VALIDAR TIMBRE ELECTRONICO SII ................................................................. 19
- AUTOMATIZACIÓN DE PROCESOS.......................................................................... 20
- ANEXOS .......................................................................................................................... 21
5.1 DTE DE EJEMPLO ................................................................................................. 21
- CERTIFICACION........................................................................................................... 26

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 3 de 29



©2009 Servicio de Impuestos Internos SII – Chile


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 4 de 29
## 1. DATOS DE LA EMPRESA

Su   empresa   operará   en   el   ambiente   de   certificación   de   Documentos   Tributarios
Electrónicos (DTE en adelante), con los siguientes datos:

## Rut Emisor, Fecha Resolución, Numero Resolución

Documentos Autorizados (TipoDTE)
## Factura Electrónica (33)
Nota de Crédito Electrónica (61)
Nota de Débito Electrónica (56)
Guía de Despacho Electrónica (52)

Confirme estos datos para Su Empresa en la opción “Consultar Empresas Autorizadas”



















## Usuario Administrador(*)
## Nombre:
## RUT:
(*) Previamente debe obtener un Certificado Digital (Rut Digital) emitido por alguna de las
Empresas acreditadas ante el SII (Ver Proveedores de Certificados Digitales
## )

e-mail Contacto SII: (*)
(*)  A  este  correo  electrónico  se  enviarán  las  respuestas  del  resultado  de  los  envíos  de
documentos  al  SII.  Se  recomienda  utilizar  un  e-mail  genérico  destinado  exclusivamente  a
estos fines (ejemplo recepciondte@suempresa.cl
## ).

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 5 de 29
## 1.1 USUARIOS AUTORIZADOS
Inicialmente existe 1 único usuario autorizado, denominado Usuario Administrador, quien a
su vez es el único encargado de ingresar otros usuarios al sistema.

Los Usuarios Autorizados deben cumplir con:

- Estar autenticados ante el sitio web del SII, es decir debe poseer Rut-Clave en el SII
Visite el web SII, bajo la Opción “Clave Secreta y Certificado Digital” (Fig.1)

- Poseer  un  Certificado  Digital  extendido  para  su  RUT  personal,  por  alguna  de  las
empresas  Certificadoras  autorizadas  por  el  SII  (Acepta.com,  E-CertChile,  Once).

- Modificar su modalidad de autenticación ante el SII para que acepte su Certificado
Digital.  Recomendamos  dejar  habilitada  la  autenticación  con  ambas  opciones  (Rut
clave y Certificado Digital) (Fig.
## Fig.1


## Fig.2

## 2. AMBIENTE DE CERTIFICACIÓN
El  SII  ofrece  un  ambiente  de  pruebas  para  los  contribuyentes  que  desean  ingresar  al
sistema, a través de un ambiente de certificación que es idéntico al ambiente que utilizan las
empresas que ya están operando con el sistema de facturación electrónica.

Ingrese a la siguiente dirección web:

https://maullin.sii.cl/cvc/dte/certificacion_dte.html


(*) Se recomienda utilizar Internet Explorer versión 5.5 o superior.


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 6 de 29
(*) Previamente debe tener instalado su Certificado Digital para acceder a las opciones para
contribuyentes autorizados y estar dentro de la lista de usuarios autorizados de la empresa
(Capítulo 1. Usuarios Autorizados).

En  adelante  nos  referiremos  a  las  opciones  indicadas  bajo  el  título  de  “
Opciones  para
contribuyentes autorizados (*)




## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 7 de 29
## 2.1 AGREGAR USUARIOS

Esta  opción  es  realizada  solamente  por  el  Usuario  Administrador.  Puede  agregar  cuantos
usuarios quiera y darle las atribuciones o perfiles que se indican:

El   Usuario   Administrador   debe   ingresar   a   la   Opción   “Mantención   de   Usuarios
Autorizados”, y digitar el Rut de la empresa.




en donde inicialmente se muestra la lista de usuarios y el perfil o atributo que tiene:

Actualmente hay 5 atributos asociados a un Usuario Autorizado:

- Usuario Administrador: Tiene el atributo de poder hacer Mantención de Usuarios,
Agregar, Eliminar, o Modificar perfiles.
- Solicitar Folio: Persona autorizada a solicitar Rango de Folios.
- Anular Folio: Persona autorizada para anular Folios
- Firmar Doctos: Persona autorizada a Firmar Documentos Electrónicos
- Enviar  Doctos:  Persona  autorizada  a  hacer  los  Envios  de  documentos  al  SII  y  a
firmar el envio de DTE.

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 8 de 29
Al ingresar un nuevo usuario debe ingresar el RUT y el (los) perfil (es) correspondiente a la
función que ejecutará (Fig.3)


## Fig. 3


Estos perfiles son independientes entre sí y un Usuario puede tener uno o varios atributos.
A  modo  de  ejemplo,  el  Usuario  Administrador  inicialmente  tiene  solamente  el  atributo  de
Usuario  Administrador,  es  decir  no  puede  Solicitar  Folios  o  Enviar  documentos.  Para
realizar esas tareas debe habilitar para sí mismo los respectivos atributos.


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 9 de 29
## 2.2 SOLICITUD DE TIMBRAJE ELECTRONICO


Ingrese  a  la  opción  “Solicitud  de  Timbraje  Electrónico  de  Documentos”.  Luego  de
identificarse con su Certificado Digital, ingrese el RUT de la Empresa, seleccione el Tipo
de Documento  y digite la cantidad de folios solicitados. (Fig.5)

(*) El usuario que ingresa a esta opción debe tener perfil para “Solicitar Folios”


## Fig.5


Luego  se  le  pide  confirmar  la  solicitud,  para  lo  cual  debe  pinchar  el  botón  “Obtener
Folios”.  Entonces  aparece  un  Comprobante  de  Solicitud  de  Folios,  que  se    recomienda
imprimir para sus registros internos. (Fig.6)


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 10 de 29

## Fig.6

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 11 de 29

Desde esta pantalla  puede bajar el archivo xml que contiene el Código de Autorización de
Folios (CAF).


Fig.7 CAF

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 12 de 29
## 2.3 ENVÍO DE DOCUMENTOS


Ir a la opción “Envío de Documentos Tributarios Electrónicos” del menú de contribuyentes
autorizados. (Fig.8)

(*) El usuario que ingresa a esta opción debe tener perfil para “Enviar Documentos”


## Fig.8

Ingrese el Rut de la Empresa y Seleccione el archivo a enviar (debe tener extensión *.xml).

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 13 de 29

El  Sistema  le  entregará  una  respuesta  en  donde  se  indica  los  datos  del  envío  (fecha,  hora,
Rut  Empresa,  Rut  Enviador)  y  en  la  esquina  superior  derecha  un  Identificador  de  envío,
con  el  cual  podrá  posteriormente  consultar  el  resultado  de  la  validación  (Documentos
Aceptados, Rechazados). (Fig.9)


## Fig.9



## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 14 de 29
## 2.4 CONSULTA DE ENVÍOS

Ir  a  la  opción  “Consulta  Estado  de  un  Envío”,    ingrese  el  Rut  de  la  Empresa  y  el
“Identificador de Envío” que fue entregado al momento de realizar el envío. (Fig.10)


## Fig.10


En forma posterior a la revisión del envío también se genera un e-mail con la respuesta de
la  validación  del  envío,  en  donde  se  indican  fecha,  hora,  Ruts,  e  identificador  del  envío.




## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 15 de 29
Existe  la  opción  “Historia  de  Envíos”  que  entrega  un  resumen  de  los  últimos  envíos
realizado por la Empresa (Fig.11)

## Fig.11
## 2.5 OTRAS OPCIONES

Para las empresas autorizadas también existen las siguientes opciones:
- Anulación de Folios : Para inutilizar o anular  1 o más folios.
- Reobtención de Folios: Para obtener un nuevo archivo CAF de un Rango que había
sido  autorizado  anteriormente.  Si  por  algún  motivo  necesita  una  copia  del  archivo
de autorización que realizó anteriormente.
- Información  de  Timbrajes  Históricos:  Resumen  de  todas  las  Solicitudes  de  Folio
autorizadas por el SII, fecha, rango y quién lo solicitó.
- Consulta   de   Folios   Anulados:   Resumen   de   todas   las   Solicitudes   de   Folio
autorizadas por el SII, fecha, rango y quién lo solicitó.
- Consulta entre Contribuyentes Autorizados: Permite a una empresa conocer datos
de otras empresas autorizadas como los documentos que tiene autorizado emitir y la
dirección  del  correo  electrónico  que  tiene  destinada  al  intercambio  de  documentos
electrónicos con otras empresas.
- Documentación para empresas autorizadas: Documentación técnica que incluye la
documentación necesaria para operar en el sistema, las instrucciones para construir
el set de prueba de certificación y la documentación de los servicios automáticos.

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 16 de 29
## •
Actualización  de  Datos  de  la  Empresa:  Opción  habilitada  para  Representantes
Legales  de  las  empresas,  en  que  pueden  cambiar  el  Usuario  Administrador  y  los
datos de correos y otros que se ingresaron en la postulación.
Para todos los contribuyentes que ingresan al sitio web del SII se encuentran disponibles las
opciones de consulta de:

- Empresas Autorizadas. Es un listado de las empresas autorizadas por el SII
a emitir documentos electrónicos.

- Verificación del contenido de un documento electrónico. Previo ingreso de
los datos relevantes de un documentos (Ruts, fecha, montos) el SII responde
acerca  de  si  ese  documento  ha  sido  recibido  y  si  los  datos  ingresados
coinciden.

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 17 de 29
## 3. DOCUMENTOS TRIBUTARIOS ELECTRONICOS (DTE)
3.1 Estructura de un DTE

Los  DTE  tienen  estructura  de  un  archivo  xml  en  donde  se  distinguen  las  siguientes
secciones:

- SetDTE,  sección  del  documento  que  contiene  toda  la  data  del  envío,  esto  es  la
Carátula y 1 o más DTE, y su respectiva firma electrónica
- Carátula, sección que contiene los datos principales de quien hace el envío, a quién
va dirigido, y el tipo y cantidad de documentos que contiene el envío.
- DTE,  sección  que  contiene  la  data  de  un  único  Documento  y  su  respectiva  firma
electrónica.
- Documento, sección  que  contiene  la  información  en  detalle  del  dte,  emisor,
receptor, ítems de detalle, etc
- Signature, sección que contiene la firma electrónica y los parámetros con los cuales
fue generada, de acuerdo al estándar XML Digital Signature.


Fig. Estructura de un DTE

El detalle completo del formato de un DTE se encuentra en la especificación del schema.
-> Ver archivo:  EnvioDTE_v10.xsd

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 18 de 29
3.2 Proceso de Validación

Los DTE recibidos por el SII pasan por un proceso de validación cuyo resultado puede ser
uno de los siguientes:

- Envío Procesado: El envío completo fue validado de acuerdo al schema y su firma
electrónica.  Sin  embargo  en  su  interior  pueden  haber  documentos  Aceptados  o
Rechazados,  a  nivel  individual.  Se  individualizan  los  documentos  que  presentan
algún Reparo o que han sido Rechazados.

- Envío  Rechazado.  El  envío  completo  es  rechazado,  ningún  documento  contenido
dentro  del  envío  fue  aceptado.  Generalmente  esto  es  debido  a  errores  de  Schema,
error  en  la  firma  del  envío,  o  usuario  no  autorizado.  Estos  documentos  deben  ser
reenviados por la empresa una vez corregido los errores.

El siguiente diagrama muestra las validaciones generales por las que pasa un envío.


Para  el  envío  de  documentos  tributarios  electrónicos  (DTE)  válidos  recomendamos  seguir
los siguientes pasos:

## 1- Validar Schema
## 2- Validar Firma Digital
3- Validar Timbre Electrónico SII

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 19 de 29
## VALIDAR SCHEMA

Los  DTE  deben  ser  validados  contra  el  schema  EnvioDTE_v10.xsd  (disponible  en  sitio
web SII). Como primer paso es imprescindible ajustar el formato de los documentos a esta
especificación.

Existen  software  para  verificar  un  xml  contra  un  schema,  lo  cual  facilita  la  validación  sin
tener que enviar al SII y esperar la respuesta. (Ej. XMLSpy.com)

Otra alternativa es utilizar herramientas de validación en internet, por ejemplo visite la web:
http://apps.gotdotnet.com/xmltools/xsdvalidator/




## VALIDAR FIRMA DIGITAL

Una vez aprobada la validación de schema se procede a verificar la firma digital. Esta firma
digital debe ajustarse al estándar “XML Digital Signature”

visitar link http://www.w3c.org/Signature/


En  esa  misma  dirección  se  informan  sobre  librerías  para  el  desarrollo  en  diferentes
plataformas (Java, C, .Net, etc). Algunas de estas librerías son gratuitas y otras comerciales
para el desarrollo de aplicaciones para este tipo de firma.


## VALIDAR TIMBRE ELECTRONICO SII

Como  un  tercer  paso  sugerimos  dedicarse  a  generar  un  Timbre  Electrónico  SII  válido,  de
acuerdo a las especificaciones indicadas en la documentación técnica disponible en el sitio
web del SII.

La  firma  del  Timbre  Electrónico  es  una  firma  RSA  Standard  (PKCS#1),  en  donde  el
método de hashing es SHA-1, la llave privada (Private Key) es la que entrega el SII dentro
del Código de Autorización de Folios (CAF), y el Mensaje a firmar es un string formado de
acuerdo a lo indicado en la documentación técnica.







## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 20 de 29
## 4. AUTOMATIZACIÓN DE PROCESOS

En forma opcional las empresas pueden implementar la automatización de los procesos de
envío de documentos al SII y de consulta de los mismos.  Para ello el SII ha implementado
estas  funcionalidades  a  través  de  webservices.    Existe  documentación  para  los  siguientes
webservices:

- Autenticación con Certificado Digital
- Upload automático (*)
- Consulta Estado de un Envío
- Verificación Detalle de un DTE

(*)  El  upload  automático  no  es  un  webservice  sino  una  emulación  de  la  conexión  https,
pero   su   documentación   está   asociada   a   las   especificaciones   del   webservice   de
autenticación.






## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 21 de 29
## 5. ANEXOS

## 5.1 DTE DE EJEMPLO

Se  adjunta  el  siguiente  documento  de  ejemplo  de  acuerdo  a  los  siguientes  datos  de  una
Empresa ficticia:

Rut Emisor:     97975000-5  (Rut Empresa)
Rut Envia:   7880442-4  (Rut Usuario autorizado a Enviar)
Fecha Resolución:      2002-10-20  (Variable particular para cada Empresa)
Numero Resolución:  0  (Valor fijo en Ambiente de Certificación)
Tipo DTE:   33  (Factura Electrónica)
## Folio:                                                1582
NroDTE:   1 (Cantidad Total de DTE incluidos en este envio)

Este es un archivo DTE válido en el ambiente de Certificación.




<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioDTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xsi:schemaLocation="http://www.sii.cl/SiiDte EnvioDTE_v10.xsd" version="1.0">
<SetDTE ID="SetDoc">
<Caratula version="1.0">
<RutEmisor>97975000-5</RutEmisor>
<RutEnvia>7880442-4</RutEnvia>
<RutReceptor>60803000-K</RutReceptor>
<FchResol>2003-09-02</FchResol>
<NroResol>0</NroResol>
<TmstFirmaEnv>2003-09-08T12:31:59</TmstFirmaEnv>
<SubTotDTE>
<TpoDTE>33</TpoDTE>
<NroDTE>1</NroDTE>
</SubTotDTE>
</Caratula>
<DTE version="1.0">
<Documento                ID="F27T33">
<Encabezado>
<IdDoc>
<TipoDTE>33</TipoDTE>
<Folio>27</Folio>
<FchEmis>2003-09-08</FchEmis>
</IdDoc>
<Emisor>
<RUTEmisor>97975000-5</RUTEmisor>
<RznSoc>RUT                DE                PRUEBA</RznSoc>
<GiroEmis>Insumos                de Computacion</GiroEmis>
<Acteco>31341</Acteco>
<CdgSIISucur>1234</CdgSIISucur>
<DirOrigen>Teatinos                120,                Piso                4</DirOrigen>
<CmnaOrigen>Santiago</CmnaOrigen>
<CiudadOrigen>Santiago</CiudadOrigen>
</Emisor>
<Receptor>
<RUTRecep>8414240-9</RUTRecep>
<RznSocRecep>JORGE                GONZALEZ LTDA</RznSocRecep>
<GiroRecep>COMPUTACION</GiroRecep>
<DirRecep>SAN                DIEGO                2222</DirRecep>

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 22 de 29
<CmnaRecep>LA                FLORIDA</CmnaRecep>
<CiudadRecep>SANTIAGO</CiudadRecep>
</Receptor>
<Totales>
<MntNeto>426226</MntNeto>
<TasaIVA>18</TasaIVA>
## <IVA>76720</IVA>
<MntTotal>502946</MntTotal>
</Totales>
</Encabezado>
<Detalle>
<NroLinDet>1</NroLinDet>
<CdgItem>
<TpoCodigo>INT1</TpoCodigo>
<VlrCodigo>011</VlrCodigo>
</CdgItem>
<NmbItem>Cajon                AFECTO</NmbItem>
<DscItem/>
<QtyItem>139</QtyItem>
<PrcItem>1807</PrcItem>
<MontoItem>251173</MontoItem>
</Detalle>
<Detalle>
<NroLinDet>2</NroLinDet>
<CdgItem>
<TpoCodigo>INT1</TpoCodigo>
<VlrCodigo>022</VlrCodigo>
</CdgItem>
<NmbItem>Relleno                AFECTO</NmbItem>
<DscItem/>
<QtyItem>59</QtyItem>
<PrcItem>2967</PrcItem>
<MontoItem>175053</MontoItem>
</Detalle>
<Referencia>
<NroLinRef>1</NroLinRef>
<TpoDocRef>SET</TpoDocRef>
<FolioRef>1</FolioRef>
<FchRef>2003-08-01</FchRef>
<CodRef>1</CodRef>
<RazonRef>Caso                4256-1</RazonRef>
</Referencia>
<TED                version="1.0">
## <DD>
## <RE>97975000-5</RE>
## <TD>33</TD>
## <F>27</F>
## <FE>2003-09-08</FE>
## <RR>8414240-9</RR>
## <RSR>JORGE                GONZALEZ                LTDA</RSR>
## <MNT>502946</MNT>
<IT1>Cajon                AFECTO</IT1>
<CAF version="1.0">
## <DA>
## <RE>97975000-5</RE>
## <RS>RUT                DE                PRUEBA</RS>
## <TD>33</TD>
## <RNG>
## <D>1</D>
## <H>200</H>
## </RNG>
## <FA>2003-09-04</FA>
## <RSAPK>

<M>0a4O6Kbx8Qj3K4iWSP4w7KneZYeJ+g/prihYtIEolKt3cykSxl1zO8vSXu397QhTmsX7SBEudTUx++2zDXBhZw
## ==</M>
<E>Aw==</E>
## </RSAPK>
## <IDK>100</IDK>
## </DA>
## <FRMA
algoritmo="SHA1withRSA">g1AQX0sy8NJugX52k2hTJEZAE9Cuul6pqYBdFxj1N17umW7zG/hAavCALKByHzdYAfZ3LhGT
XCai5zNxOo4lDQ==</FRMA>

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 23 de 29
## </CAF>
## <TSTED>2003-09-08T12:28:31</TSTED>
## </DD>
## <FRMT
algoritmo="SHA1withRSA">pqjXHHQLJmyFPMRvxScN7tYHvIsty0pqL2LLYaG43jMmnfiZfllLA0wb32lP+HBJ
/tf8nziSeorvjlx410ZImw==</FRMT>
## </TED>
<TmstFirma>2003-09-08T12:28:31</TmstFirma>
</Documento>
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="#F27T33">
<Transforms>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>C9T6trZSt8zZUQK2+YUkYuIw5pE=</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>kAxNuhGppcs1mTd6sXYGwy+etbKBlOqboMvnO2qyARJYmibHEGb3NOsunmPQS8D+ZHZH/QENE47m
wVSKb/HgqjfIU1zsQcxEnTLQgbG9H6JYmSVXNh5DfVYXFmIDv/1kQOoeu8w8zPLeGLSQzVZ2fK9M9zzcUGWRWvZ6aNP
p59o=</SignatureValue>
<KeyInfo>
<KeyValue>
<RSAKeyValue>
<Modulus>
tNEknkb1kHiD1OOAWlLKkcH/UP5UGa6V6MYso++JB+vYMg2OXFROAF7G8BNFFPQx
iuS/7y1azZljN2xq+bW3bAou1bW2ij7fxSXWTJYFZMAyndbLyGHM1e3nVmwpgEpx
BHhZzPvwLb55st1wceuKjs2Ontb13J33sUb7bbJMWh0=
</Modulus>
<Exponent>
## AQAB
</Exponent>
</RSAKeyValue>
</KeyValue>
<X509Data>
<X509Certificate>MIIEPjCCA6mgAwIBAgIDAgGKMAsGCSqGSIb3DQEBBDCBsTEdMBsGA1UECBQUUmVn
aW9uIE1ldHJvcG9saXRhbmExETAPBgNVBAcUCFNhbnRpYWdvMSIwIAYDVQQDFBlF
LUNlcnRjaGlsZSBDQSBJbnRlcm1lZGlhMTYwNAYDVQQLFC1FbXByZXNhIE5hY2lv
bmFsIGRlIENlcnRpZmljYWNpb24gRWxlY3Ryb25pY2ExFDASBgNVBAoUC0UtQ0VS
VENISUxFMQswCQYDVQQGEwJDTDAeFw0wMjEwMDIxOTExNTlaFw0wMzEwMDIwMDAw
MDBaMIHXMR0wGwYDVQQIFBRSZWdpb24gTWV0cm9wb2xpdGFuYTEnMCUGA1UECxQe
U2VydmljaW8gZGUgSW1wdWVzdG9zIEludGVybm9zMScwJQYDVQQKFB5TZXJ2aWNp
byBkZSBJbXB1ZXN0b3MgSW50ZXJub3MxETAPBgNVBAcUCFNhbnRpYWdvMR8wHQYJ
KoZIhvcNAQkBFhB3Z29uemFsZXpAc2lpLmNsMSMwIQYDVQQDFBpXaWxpYmFsZG8g
R29uemFsZXogQ2FicmVyYTELMAkGA1UEBhMCQ0wwXDANBgkqhkiG9w0BAQEFAANL
ADBIAkEAvNQyaLPd3cQlBr0fQWooAKXSFan/WbaFtD5P7QDzcE1pBIvKY2Uv6uid
ur/mGVB9IS4Fq/1xRIXy13FFmxLwTQIDAQABo4IBgjCCAX4wIwYDVR0RBBwwGqAY
BggrBgEEAcNSAaAMFgowNzg4MDQ0Mi00MDwGA1UdHwQ1MDMwMaAvoC2GK2h0dHA6
Ly9jcmwuZS1jZXJ0Y2hpbGUuY2wvRWNlcnRjaGlsZUNBSS5jcmwwIwYDVR0SBBww
GqAYBggrBgEEAcEBAqAMFgo5NjkyODE4MC01MIHmBgNVHSAEgd4wgdswgdgGCCsG
AQQBw1IAMIHLMDYGCCsGAQUFBwIBFipodHRwOi8vd3d3LmUtY2VydGNoaWxlLmNs
L3BvbGl0aWNhL2Nwcy5odG0wgZAGCCsGAQUFBwICMIGDGoGARWwgdGl0dWxhciBo
YSBzaWRvIHZhbGlkYWRvIGVuIGZvcm1hIHByZXNlbmNpYWwsIHF1ZWRhbmRvIGhh
YmlsaXRhZG8gZWwgQ2VydGlmaWNhZG8gcGFyYSB1c28gdHJpYnV0YXJpbywgcGFn
b3MsIGNvbWVyY2lvIHUgb3Ryb3MwCwYDVR0PBAQDAgTwMAsGCSqGSIb3DQEBBAOB
gQB2V4cTj7jo1RawmsRQUSnnvJjMCrZstcHY+Ss3IghVPO9eGoYzu5Q63vzt0Pi8
CS91SBc7xo+LDoljaUyjOzj7zvU7TpWoFndiTQF3aCOtTkV+vjCMWW3sVHes4UCM
DkF3VYK+rDTAadiaeDArTwsx4eNEpxFuA/TJwcXpLQRCDg==</X509Certificate>
</X509Data>
</KeyInfo>
</Signature></DTE>
</SetDTE><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="#SetDoc">
<Transforms>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 24 de 29
<DigestValue>z4vLb55G61Q3156xX9/PiUR0d5A=</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>FD0hdAwcAk/UkpPZHZfKRDdgN2x0MtLgcXBgkyloo2Q5Ufd7KQrbIwqydNtS3KKWcoAVjQ9C7UeWN1xM
R8KD1p07Lt/Yq1Fr1rbq4/naTFEN4AlMlx3R8Z3oZcjB7Jq+Buazeff4iadPWdw0osz6/eQlfyUe/TSRV9mnz8Azok8=</Signature
## Value>
<KeyInfo>
<KeyValue>
<RSAKeyValue>
<Modulus>
tNEknkb1kHiD1OOAWlLKkcH/UP5UGa6V6MYso++JB+vYMg2OXFROAF7G8BNFFPQx
iuS/7y1azZljN2xq+bW3bAou1bW2ij7fxSXWTJYFZMAyndbLyGHM1e3nVmwpgEpx
BHhZzPvwLb55st1wceuKjs2Ontb13J33sUb7bbJMWh0=
</Modulus>
<Exponent>
## AQAB
</Exponent>
</RSAKeyValue>
</KeyValue>
<X509Data>
<X509Certificate>MIIEPjCCA6mgAwIBAgIDAgGKMAsGCSqGSIb3DQEBBDCBsTEdMBsGA1UECBQUUmVn
aW9uIE1ldHJvcG9saXRhbmExETAPBgNVBAcUCFNhbnRpYWdvMSIwIAYDVQQDFBlF
LUNlcnRjaGlsZSBDQSBJbnRlcm1lZGlhMTYwNAYDVQQLFC1FbXByZXNhIE5hY2lv
bmFsIGRlIENlcnRpZmljYWNpb24gRWxlY3Ryb25pY2ExFDASBgNVBAoUC0UtQ0VS
VENISUxFMQswCQYDVQQGEwJDTDAeFw0wMjEwMDIxOTExNTlaFw0wMzEwMDIwMDAw
MDBaMIHXMR0wGwYDVQQIFBRSZWdpb24gTWV0cm9wb2xpdGFuYTEnMCUGA1UECxQe
U2VydmljaW8gZGUgSW1wdWVzdG9zIEludGVybm9zMScwJQYDVQQKFB5TZXJ2aWNp
byBkZSBJbXB1ZXN0b3MgSW50ZXJub3MxETAPBgNVBAcUCFNhbnRpYWdvMR8wHQYJ
KoZIhvcNAQkBFhB3Z29uemFsZXpAc2lpLmNsMSMwIQYDVQQDFBpXaWxpYmFsZG8g
R29uemFsZXogQ2FicmVyYTELMAkGA1UEBhMCQ0wwXDANBgkqhkiG9w0BAQEFAANL
ADBIAkEAvNQyaLPd3cQlBr0fQWooAKXSFan/WbaFtD5P7QDzcE1pBIvKY2Uv6uid
ur/mGVB9IS4Fq/1xRIXy13FFmxLwTQIDAQABo4IBgjCCAX4wIwYDVR0RBBwwGqAY
BggrBgEEAcNSAaAMFgowNzg4MDQ0Mi00MDwGA1UdHwQ1MDMwMaAvoC2GK2h0dHA6
Ly9jcmwuZS1jZXJ0Y2hpbGUuY2wvRWNlcnRjaGlsZUNBSS5jcmwwIwYDVR0SBBww
GqAYBggrBgEEAcEBAqAMFgo5NjkyODE4MC01MIHmBgNVHSAEgd4wgdswgdgGCCsG
AQQBw1IAMIHLMDYGCCsGAQUFBwIBFipodHRwOi8vd3d3LmUtY2VydGNoaWxlLmNs
L3BvbGl0aWNhL2Nwcy5odG0wgZAGCCsGAQUFBwICMIGDGoGARWwgdGl0dWxhciBo
YSBzaWRvIHZhbGlkYWRvIGVuIGZvcm1hIHByZXNlbmNpYWwsIHF1ZWRhbmRvIGhh
YmlsaXRhZG8gZWwgQ2VydGlmaWNhZG8gcGFyYSB1c28gdHJpYnV0YXJpbywgcGFn
b3MsIGNvbWVyY2lvIHUgb3Ryb3MwCwYDVR0PBAQDAgTwMAsGCSqGSIb3DQEBBAOB
gQB2V4cTj7jo1RawmsRQUSnnvJjMCrZstcHY+Ss3IghVPO9eGoYzu5Q63vzt0Pi8
CS91SBc7xo+LDoljaUyjOzj7zvU7TpWoFndiTQF3aCOtTkV+vjCMWW3sVHes4UCM
DkF3VYK+rDTAadiaeDArTwsx4eNEpxFuA/TJwcXpLQRCDg==</X509Certificate>
</X509Data>
</KeyInfo>
</Signature></EnvioDTE>

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 25 de 29
## 5.2 TIMBRE ELECTRONICO DE EJEMPLO

Para el ejemplo anterior (5.1) el timbre fue generado como sigue:

1) Del xml indicado se arma el string que será firmado (Mensaje)

## Mensaje=
## <DD><RE>97975000-5</RE><TD>33</TD><F>27</F><FE>2003-09-08</FE>
## <RR>8414240-9</RR><RSR>JORGE GONZALEZ LTDA</RSR><MNT>502946</M
NT><IT1>Cajon AFECTO</IT1><CAF version="1.0"><DA><RE>97975000-
## 5</RE><RS>RUT DE PRUEBA</RS><TD>33</TD><RNG><D>1</D><H>200</H>
</RNG><FA>2003-09-04</FA><RSAPK><M>0a4O6Kbx8Qj3K4iWSP4w7KneZYe
J+g/prihYtIEolKt3cykSxl1zO8vSXu397QhTmsX7SBEudTUx++2zDXBhZw==<
/M><E>Aw==</E></RSAPK><IDK>100</IDK></DA><FRMA algoritmo="SHA1
withRSA">g1AQX0sy8NJugX52k2hTJEZAE9Cuul6pqYBdFxj1N17umW7zG/hAa
vCALKByHzdYAfZ3LhGTXCai5zNxOo4lDQ==</FRMA></CAF><TSTED>2003-09
## -08T12:28:31</TSTED></DD>

2) Desde el Código de Autorización de Folios (CAF) el SII entrega la llave privada en
formato PEM con la cual se firmará el Mensaje.

## -----BEGIN RSA PRIVATE KEY-----
MIIBOwIBAAJBANGuDuim8fEI9yuIlkj+MOyp3mWHifoP6a4oWLSBKJSrd3MpEsZd
czvL0l7t/e0IU5rF+0gRLnU1Mfvtsw1wYWcCAQMCQQCLyV9FxKFLW09yWw7bVCCd
xpRDr7FRX/EexZB4VhsNxm/vtJfDZyYle0Lfy42LlcsXxPm1w6Q6NnjuW+AeBy67
AiEA7iMi5q5xjswqq+49RP55o//jqdZL/pC9rdnUKxsNRMMCIQDhaHdIctErN2hC
IP9knS3+9zra4R+5jSXOvI+3xVhWjQIhAJ7CF0R0S7SIHHKe04NUURf/7RvkMqm1
08k74sdnXi3XAiEAlkWk2vc2HM+a1sCqQxNz/098ketqe7NuidMKeoOQObMCIQCk
FAMS9IcPcMjk7zI2r/4EEW63PSXyN7MFAX7TYe25mw==
## -----END RSA PRIVATE KEY-----

3) El resultado obtenido de la firma RSA-SHA1, utilizado la llave privada 2) sobre el
mensaje 1) es:

pqjXHHQLJmyFPMRvxScN7tYHvIsty0pqL2LLYaG43jMmnfiZfllLA0wb32lP+HBJ
/tf8nziSeorvjlx410ZImw==


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 26 de 29
## 6. CERTIFICACION

La  Certificación  es  un  proceso  compuesto  por  varios  pasos  en  cada  uno  de  los  cuales  los
postulantes van completando las pruebas solicitadas y declarando su avance al SII. Una vez
terminadas  las  pruebas,  el  postulante  debe  efectuar  una  declaración  en  donde  señala  que
además de haber completado exitosamente las pruebas requeridas, cuenta en su instalación
con  los  procedimientos  y  condiciones  solicitados  por  el  SII  para  generar  y  recibir
adecuadamente documentos tributarios electrónicos. El proceso de certificación contempla
los siguientes pasos:

- Set de Prueba asignado por el SII.
## 2. Simulación.
- Intercambio de Información
- Envío de Muestras de Impresión.
- Declaración de Cumplimiento de Requisitos.
- Autorización del Contribuyente.

Si  todas  las  pruebas  de  certificación  se  completan  exitosamente,  el  Postulante  será
autorizado por el SII para operar con la Factura Electrónica

A continuación se describen en detalle los pasos de la certificación

- Set de Prueba asignado por el SII.

Este  paso  consiste  en  la  recepción  en  el  SII,  sin  rechazos  ni  reparos,  de  un  envío  de
documentos que el postulante construye en base a un archivo con datos de prueba que el SII
genera en forma única para cada Postulante, en función de su giro y de los documentos que
desea   certificar.   Además   de   documentos   tributarios   electrónicos,   en   este   paso   los
Postulantes  deben  enviar  también  al  SII,  como  parte  de  las  pruebas,  la  Información
Electrónica de Ventas y la Información Electrónica de Compras.

Se recomienda realizar el Set de Pruebas, una vez que Ud. haya realizado pruebas de envíos
exitosos al SII (Aceptados sin Reparos). En cualquier momento, además, tiene la opción de
obtener un nuevo Set de Pruebas (Fig. “Generación Nuevo Set de Pruebas”). Recuerde que
los  envíos  correspondientes  al  Set  de  Prueba  serán  evaluados  respecto  al  último  Set  de
Pruebas que haya bajado.

Para la construcción de los Documentos Tributarios Electrónicos, así como la Información
Electrónica  de  Ventas  y  Información  Electrónica  de  Compras,  con  los  datos  del  Set  de
Pruebas   entregado   por   el   SII,      se   deben   seguir   las   indicaciones   del   documento
“Instrucciones   para   la   Construcción   del   Set   de   Prueba”,   disponible   en   la   opción
“Documentación para Empresas Autorizadas”.

Los envíos con los documentos generados a partir de los datos del set de prueba deben ser
enviados al SII dentro del plazo de 2 meses contados a partir del momento de obtener el set
de  prueba.  Los  envíos  que  excedan  ese  plazo  serán  rechazados  y  el  postulante  deberá
Generar  un  Nuevo  Set  de  pruebas    para  realizar  las  pruebas.  El  postulante  puede  iterar

## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 27 de 29
cuanto desee enviando archivos correspondientes al set de prueba. Cuando el resultado de
la  validación  de  dichos  envíos  resulte  sin  rechazos  ni  reparos  el  usuario  administrador
puede  declararlos  para  la  revisión  del  SII.  Esta  revisión  consistirá  en  comprobar  que  el
envío haya sido realizado con los datos del set de prueba entregado al postulante.

Usando  la  opción  Declarar  Avance  de  la  Postulación,  el  Postulante  puede  informar  al  SII
que  completó  exitosamente  el  Set  de  Pruebas,  señalando  la  fecha  y  número  de  cada  envío
para permitir al SII verificar su validez.

Una vez que el SII haya verificado que el postulante completó satisfactoriamente el set de
prueba, el SII le permitirá avanzar al siguiente paso, la Simulación.


## 2. Simulación.

La simulación es una etapa que contempla la generación de un envío, recibido en el SII sin
rechazos  ni  reparos,  con  los  documentos  tributarios  electrónicos  correspondientes  a  su
facturación  de  los  últimos  2  meses,  con  un  máximo  de  100  documentos,  con  datos
representativos, paralelos de la operación real del contribuyente que desea certificarse.

En  el  caso  de  los  contribuyentes  con  gran  volumen  de  facturación,  los  100  documentos
pueden  corresponder  a  un  sólo  mes  y  en  el  caso  de  las  empresas  con  bajo  volumen  de
facturación, los documentos pueden abarcar un período de más de 2 meses, con un mínimo
de  10  documentos,  si  no  tiene  facturación  suficiente.  El  Servicio  chequeará  el  número  de
documentos enviados en la Simulación con el volumen histórico de timbraje de papeles.

Usando  la  opción  Declarar  Avance  de  la  Postulación,  el  Postulante  puede  informar  al  SII
que  completó  exitosamente  la  simulación,  señalando  la  fecha  y  número  de  envío  para
permitir al SII verificar su validez

Una  vez  que  el  SII  haya  verificado  que  el  postulante  completó  satisfactoriamente  la
simulación, se le permitirá avanzar al siguiente paso, las pruebas de impresión


- Intercambio de Información
En  esta  etapa  el  SII  envía  documentos  tributarios  electrónicos  al  contribuyente  postulante
para comprobar que éste entrega un acuse de recibo del envío y la aceptación o rechazo de
los  documentos  enviados,  de  acuerdo  a  las  definiciones  que  el  SII  ha  establecido  para  el
intercambio de información entre contribuyentes autorizados.
El  SII  hará  envío  de  DTEs,  a  la  casilla  de  correo  electrónico  que  el  postulante  tiene
registrada en el SII como Mail de Contacto Empresas. El postulante deberá enviar un  acuse
de  recibo  del  envío  y  la  aceptación  o  rechazo  de  los  documentos  de  acuerdo  al  schema
XML  establecido  por  el  SII  para  el  intercambio  de  información  entre  contribuyentes
autorizados a la siguiente casilla: SII_dte_intercambio@sii.cl


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 28 de 29
Una vez que el SII haya revisado y verificado la consistencia de las respuestas enviadas, se
considera  que  la  empresa  ha  superado  la  prueba  de  Intercambio  de  Información  y  la
empresa pasará a la siguiente etapa del proceso de certificación.

- Pruebas de Impresión de DTEs.

Esta etapa considera la entrega al SII de la imagen de un conjunto de documentos impresos
de acuerdo a la normativa y que incluyan el timbre electrónico en representación PDF417.
Estas  imágenes  se  deben    entregar  en  un  archivo  de  tipo  PDF  adjunto  a  un  correo
electrónico enviado a la siguiente casilla: sii_dte_impresos@sii.cl
## .

El archivo enviado al SII debe contener la imagen de la impresión de todos los documentos
del set de pruebas además de 10 documentos de la etapa de simulación, representativos de
todos los tipos de documentos con que el postulante operará.
Una  vez  que  el  SII  haya  revisado  y  aprobado  las  imágenes  de  impresión  enviadas,  se
considera que la empresa ha superado las pruebas de certificación y que está preparada para
que el Representante Legal haga en el web, en la opción correspondiente, la declaración de
cumplimiento de requisitos.

- Declaración de Cumplimiento de Requisitos

Una  vez  realizadas  correctamente  todas  las  pruebas  de  Certificación  el  contribuyente
deberá declarar en el web del SII, a través de su representante legal, que se obliga a cumplir
con las resoluciones del  SII que norman el sistema de Facturación Electrónica y cuenta con
la implementación de procedimientos formales y establecidos, que podrán ser auditados por
el SII, que realicen adecuadamente las siguientes funciones, estimadas críticas:

a)  Gestión  de  Códigos  de  Autorización  de  Folios  (almacenamiento  y  control  de
acceso).

b) Foliación controlada (asignación única de cada folio autorizado por el SII).

c) Respaldo de los documentos e información generada.

d) Envío de documentos al SII.

e) Intercambio (envío y recepción) de documentos con otros contribuyentes

f) Cuadratura de envíos aceptados, rechazados y aceptados con reparos por el SII

g) Administración de contingencias.


## AMBIENTE DE CERTIFICACIÓN FACTURA ELECTRONICA  -  SII
2 de Febrero de 2009
Pág. 29 de 29
Adicionalmente el representante legal del contribuyente declarará conocer las obligaciones
que  emanan  de  la  resolución  que  lo  autorizará  a  operar  en  el  sistema  de  documentos
tributarios electrónicos.



- Autorización del Contribuyente

Si todas las pruebas de certificación se completan exitosamente, y el Postulante, a través de
su  Representante  Legal,  efectúa  la  declaración  de  cumplimiento  de  Requisitos,  el  SII
emitirá una Resolución que autoriza al contribuyente a operar con Documentos Tributarios
Electrónicos  y  lo  registrará  en  su  ambiente  de  Producción  para  que  comience  a  generar
documentos  tributarios  electrónicos  legalmente  válidos  a  partir  del  período  tributario
indicado en dicha Resolución.



