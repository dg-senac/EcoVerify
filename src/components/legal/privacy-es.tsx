import { MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/** Spanish translation of the Privacy Policy. The Portuguese version (privacy-content.tsx) prevails: keep both in sync. */
export function PrivacyEs({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        Esta Política explica qué datos personales trata EcoVerify, por qué y cuáles son tus derechos. El responsable del
        tratamiento es <b>{info.controllerName}</b>. Contacto para asuntos de privacidad (encargado):{" "}
        {contactText(info.contactEmail, "es")}.
      </p>

      <LegalSection n={1} title="Datos que tratamos y para qué">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-semibold">Dato</th>
                <th className="py-2 pr-3 font-semibold">Finalidad</th>
                <th className="py-2 font-semibold">Base legal (LGPD, art. 7)</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {[
                ["Nombre, correo y contraseña (guardada solo como hash)", "Crear y proteger tu cuenta, enviar avisos de la cuenta", "Ejecución de contrato (V)"],
                ["Fotos, relato y ubicación (GPS) en el momento de la prueba", "Comprobar que la acción ocurrió en el lugar de la misión y moderar", "Ejecución de contrato (V) e interés legítimo en la prevención del fraude (IX)"],
                ["Huella digital (hash) de las fotos, incluida una versión que reconoce fotos casi iguales", "Impedir que la misma foto se reutilice", "Interés legítimo en la prevención del fraude (IX)"],
                ["Resultado de la verificación automática (veredicto, confianza, motivo y observaciones)", "Ayudar a la moderación y decidir casos claros", "Ejecución de contrato (V) e interés legítimo en la prevención del fraude (IX)"],
                ["Apelación de una decisión automática", "Revisión por una persona (LGPD, art. 20)", "Ejercicio regular de derechos (VI)"],
                ["Tarjetas (amarilla/roja), motivo, explicación del equipo, suspensiones, bloqueos y tus apelaciones", "Prevenir el fraude, aplicar las reglas de los Términos (punto 8) y permitir tu defensa", "Interés legítimo en la prevención del fraude (IX) y ejercicio regular de derechos (VI)"],
                ["Dirección de la billetera FONE, transacción de verificación y declaración de 18 años", "Probar que la billetera es tuya y pagar recompensas solo a mayores", "Ejecución de contrato (V)"],
                ["Puntos, recompensas y pagos", "Ranking, historial y rendición de cuentas de los pagos", "Ejecución de contrato (V) y cumplimiento de una obligación legal (II)"],
                ["Pedidos de “Quiero más misiones aquí” (solo la ciudad) y sugerencias de misión (texto y el punto elegido)", "Saber dónde faltan misiones y crear acciones propuestas por la comunidad", "Interés legítimo (IX) y ejecución de contrato (V)"],
                ["Mensajes y archivos del chat de la comunidad", "Funcionamiento del chat y moderación de denuncias", "Ejecución de contrato (V)"],
                ["Aceptación de los Términos (fecha y versión) y preferencias (idioma, accesibilidad)", "Registro de la aceptación y personalización", "Cumplimiento de una obligación legal (II) y ejecución de contrato (V)"],
                ["Dirección IP (temporal, en memoria) y cookie de sesión", "Mantenerte conectado y limitar los intentos de inicio de sesión y registro", "Interés legítimo en la seguridad (IX)"],
              ].map(([data, purpose, basis]) => (
                <tr key={data} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-800">{data}</td>
                  <td className="py-2 pr-3">{purpose}</td>
                  <td className="py-2">{basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          No vendemos tus datos ni los usamos para publicidad. La ubicación se lee solo cuando envías una prueba, sugieres una
          misión o pides ver misiones cerca de ti, nunca en segundo plano. Para mostrar misiones cerca de ti, la ciudad y unas
          coordenadas redondeadas (cerca de 1 km) quedan solo en una cookie de tu dispositivo, no en nuestra base de datos; el
          nombre de la ciudad se obtiene dentro de la propia aplicación, sin enviar tu posición a otros servicios. Antes de guardar
          la foto, eliminamos los metadatos del archivo (EXIF), como el modelo del dispositivo y las coordenadas incrustadas.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Verificación automática de las pruebas">
        <LegalList
          items={[
            "Cada prueba pasa por reglas automáticas (distancia a la misión, precisión del GPS, foto repetida) y, cuando está activado, por un modelo de inteligencia artificial que describe la foto e indica si coincide con la misión.",
            <>Para ello enviamos al servicio <b>Google Gemini</b> (Google LLC, EE. UU.) solo una <b>copia reducida de la foto, sin metadatos</b>, el título y las instrucciones de la misión y tu relato. <b>No enviamos</b> nombre, correo, ubicación ni ningún identificador de tu cuenta.</>,
            "En la fase de pruebas usamos el plan gratuito de Gemini. En ese plan Google puede usar el contenido enviado para mejorar sus productos y puede ser leído por revisores humanos. Por eso pedimos que el relato no contenga datos personales y que evites fotografiar el rostro de otras personas.",
            <>Cuando la <b>búsqueda inversa de imágenes</b> está activada, la misma copia reducida y sin metadatos (solo la imagen, sin relato ni datos de la cuenta) se envía a <b>Google Cloud Vision</b> (Google LLC, EE. UU., servicio de pago que no usa el contenido para entrenar modelos) para buscar la foto en internet. Si se encuentra, los enlaces van al equipo, que revisa antes de decidir: esto nunca rechaza la foto por sí solo ni genera una tarjeta.</>,
            "Los casos claros pueden aprobarse o rechazarse automáticamente (decisión automatizada). Todo rechazo informa el motivo, las misiones de mayor valor siempre pasan por una persona y, si el servicio no está disponible, la prueba va a moderación.",
            <><b>Revisión (LGPD, art. 20):</b> puedes apelar cualquier rechazo automático en Mis Envíos y una persona de moderación lo analiza de nuevo. También puedes pedir información sobre los criterios usados.</>,
          ]}
        />
      </LegalSection>

      <LegalSection n={3} title="Quién ve tus datos">
        <LegalList
          items={[
            "Los demás usuarios ven tu nombre, puntos y nivel en el ranking, y tus mensajes en el chat.",
            "Los moderadores y administradores ven las pruebas (foto, relato y ubicación) para analizarlas, y los administradores ven la billetera para hacer los pagos.",
            "Encargados que nos ayudan a funcionar, bajo contrato: alojamiento de la aplicación, base de datos y almacenamiento de archivos (por ejemplo, Vercel y Supabase), envío de correos (por ejemplo, Resend) y verificación automática de las fotos (Google Gemini y, cuando está activado, Google Cloud Vision; ver punto 2). Algunos de estos servicios están fuera de Brasil; en esos casos, la transferencia sigue las garantías de la LGPD (art. 33).",
            "Para abastecer regiones sin misiones y, fuera de Brasil, dar nombre a tu zona, el servidor consulta OpenStreetMap (mapa abierto y colaborativo) en busca de playas, parques y puntos de recolección cercanos. En esa consulta va solo la posición de la región elegida: en Brasil, el centro del municipio; en otros países, un punto redondeado (~1 km) de la región. Nunca van datos de tu cuenta.",
            "Autoridades, cuando la ley o una orden judicial lo exijan.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Blockchain: qué es público y permanente">
        <p>
          Los pagos en FONE y la transferencia de verificación de la billetera quedan registrados en la blockchain de Fone
          Protocol, que es <b>pública</b>: cualquier persona puede ver la dirección, el valor y la fecha en el explorador de la red.
          Esos registros <b>no pueden borrarse</b> por nadie, ni siquiera si eliminas tu cuenta. EcoVerify no publica tu nombre ni
          tu correo en la blockchain.
        </p>
        <p className="mt-2">
          En la página pública de <b>Transparencia</b> mostramos los totales de la aplicación y los últimos pagos (fecha, valor,
          dirección abreviada y enlace de la transacción), <b>sin nombre, correo ni foto</b>.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Niños y adolescentes">
        <p>
          EcoVerify no está destinado a menores de {MIN_AGE} años. Los adolescentes de {MIN_AGE} a 17 años solo pueden usarlo con
          autorización de su tutor legal y no reciben FONE. Tratamos sus datos en su mejor interés (LGPD, art. 14) y solo en lo
          necesario para participar en las misiones. Si eres tutor y quieres pedir la eliminación de la cuenta de un menor,
          contáctanos.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Cuánto tiempo guardamos">
        <LegalList
          items={[
            "Mientras exista tu cuenta.",
            "Al eliminar la cuenta, borramos nombre, correo, contraseña, fotos, relatos, ubicación, mensajes, billetera, notificaciones y sesiones. Conservamos, sin identificación, lo necesario para cumplir obligaciones y evitar fraudes (LGPD, art. 16): el registro de pruebas ya analizadas (sin foto, relato, ubicación ni observaciones de la verificación automática), el hash de las fotos, el historial de puntos y los pagos ya hechos.",
            "Los enlaces de confirmación de correo valen 48 horas y los de restablecimiento de contraseña, 1 hora.",
          ]}
        />
      </LegalSection>

      <LegalSection n={7} title="Tus derechos (LGPD, art. 18)">
        <LegalList
          items={[
            <><b>Acceso y portabilidad:</b> descarga tus datos en Configuración → Privacidad y datos.</>,
            <><b>Corrección:</b> cambia tu nombre y preferencias en la aplicación o contáctanos.</>,
            <><b>Eliminación:</b> elimina tu cuenta en Configuración → Privacidad y datos.</>,
            <><b>Revisión de decisiones automatizadas:</b> apela en Mis Envíos (ver punto 2).</>,
            "Información sobre el uso compartido y oposición a tratamientos basados en interés legítimo: contáctanos.",
            "También puedes reclamar ante la Autoridad Nacional de Protección de Datos de Brasil (ANPD).",
          ]}
        />
      </LegalSection>

      <LegalSection n={8} title="Seguridad">
        <p>
          Contraseñas guardadas con hash (bcrypt), conexión cifrada, archivos en almacenamiento privado accesible solo a usuarios
          conectados, límite de intentos de inicio de sesión y registro de quién aprueba y paga. Si ocurre un incidente que pueda
          ponerte en riesgo, te avisaremos a ti y a la ANPD.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies">
        <p>
          Usamos solo cookies esenciales: una que te mantiene conectado y, si eliges una región en la pantalla de misiones, otra
          que guarda esa región (ciudad, radio y coordenadas redondeadas) hasta por 180 días. Puedes cambiar o borrar la región en
          cualquier momento en “Ver todas”. No usamos cookies de publicidad ni de rastreo.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Cambios">
        <p>Cuando esta Política cambie de forma relevante, te avisaremos en la aplicación y te pediremos que aceptes la nueva versión.</p>
      </LegalSection>
    </div>
  );
}
