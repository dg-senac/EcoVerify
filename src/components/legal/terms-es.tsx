import { FONE_MIN_AGE, MIN_AGE, type LegalInfo } from "@/lib/legal";
import { LegalList, LegalSection, contactText } from "./legal-ui";

/** Spanish translation of the Terms of Use. The Portuguese version (terms-content.tsx) prevails: keep both in sync. */
export function TermsEs({ info }: { info: LegalInfo }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-slate-700">
        Estos Términos regulan el uso de EcoVerify, una aplicación que reconoce acciones sostenibles comprobadas (reciclaje,
        siembra, donaciones, jornadas de limpieza) con puntos y, para mayores de edad, recompensas en la criptomoneda FONE.
        EcoVerify es mantenido por <b>{info.controllerName}</b>. Al crear una cuenta, declaras que leíste y aceptas estos Términos
        y la Política de Privacidad.
      </p>

      <LegalSection n={1} title="Quién puede usarla">
        <LegalList
          items={[
            <>Debes tener <b>{MIN_AGE} años o más</b>. Quien tiene entre {MIN_AGE} y 17 años solo puede usarla con autorización del padre, la madre o el tutor legal.</>,
            <>Las recompensas en FONE son exclusivas para quien tiene <b>{FONE_MIN_AGE} años o más</b>. Los menores participan con puntos, niveles y ranking.</>,
            "Cada persona puede tener una sola cuenta y una sola billetera FONE vinculada. Están prohibidas las cuentas múltiples, de terceros o automatizadas.",
          ]}
        />
      </LegalSection>

      <LegalSection n={2} title="Tu cuenta">
        <p>
          Eres responsable de mantener tu correo actualizado y tu contraseña en secreto. Avísanos si sospechas de un uso indebido.
          Puedes eliminar tu cuenta en cualquier momento en Configuración.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Misiones y pruebas">
        <LegalList
          items={[
            "Envía solo pruebas verdaderas: la acción debe haberla hecho tú, en el lugar de la misión, y la foto debe ser tuya y actual.",
            "La aplicación usa la ubicación del dispositivo en el momento de la prueba para comprobar que estás en el lugar de la misión.",
            "Cada prueba pasa por una verificación automática (reglas de la aplicación y un modelo de inteligencia artificial) y por el equipo de moderación. Los casos claros pueden aprobarse o rechazarse automáticamente, siempre con el motivo informado; los demás los decide una persona.",
            "Si una prueba tuya se rechaza automáticamente, puedes apelar en Mis Envíos: la apelación siempre la revisa una persona de moderación.",
            "Fotos repetidas, montajes, fotos de pantalla, ubicación falsificada o cualquier intento de fraude llevan al rechazo y pueden llevar a tarjetas (punto 8), a la suspensión, al bloqueo y a la cancelación de recompensas.",
            "Al enviar una foto, autorizas a EcoVerify a guardarla, mostrarla al equipo de moderación y enviarla, reducida y sin datos personales, al servicio de verificación automática. No publicamos tu foto fuera de la aplicación sin tu autorización. Evita fotografiar el rostro de otras personas.",
          ]}
        />
      </LegalSection>

      <LegalSection n={4} title="Puntos">
        <p>Los puntos y niveles miden tu participación. No tienen valor en dinero y no pueden venderse, cambiarse ni transferirse.</p>
      </LegalSection>

      <LegalSection n={5} title="Recompensas en FONE">
        <LegalList
          items={[
            "FONE es la criptomoneda de la red Fone Protocol. Las recompensas dependen del presupuesto disponible de EcoVerify y de sus aliados, y los valores de las misiones pueden cambiar.",
            "Para recibirlas, debes tener 18 años o más, correo confirmado y una billetera de Fone Wallet vinculada y verificada (prueba de que la billetera es tuya).",
            "EcoVerify no guarda tus claves ni tus fondos: la billetera es tuya y es tu responsabilidad. Las transacciones en blockchain son públicas e irreversibles; una dirección equivocada no se puede corregir.",
            "Los pagos se hacen por lotes y pueden tardar algunos días. Cada recompensa pasa por un período de espera antes de pagarse (para apelaciones y control de fraude) y solo enviamos cuando el total liberado alcanza el pago mínimo, porque cada envío tiene comisión de la red. Los valores actuales están en la página pública de Transparencia.",
            "Puede haber un presupuesto mensual de EcoVerify, un presupuesto propio de cada patrocinador y un límite mensual de FONE por persona. Cuando se alcanza uno de ellos, los puntos valen normalmente y el FONE queda en espera hasta que el equipo lo libere.",
            "Las recompensas obtenidas con fraude pueden cancelarse, incluso después de aprobadas, mientras no se hayan pagado.",
            "Las criptomonedas tienen precio variable y pueden perder valor. Las recompensas no son inversión, salario ni promesa de ganancia. Las obligaciones fiscales sobre lo que recibes son tu responsabilidad.",
            "Si eliminas tu cuenta, las recompensas aún no pagadas se pierden.",
          ]}
        />
      </LegalSection>

      <LegalSection n={6} title="Comunidad">
        <p>
          En el chat, trata a todos con respeto. Está prohibido publicar contenido ilegal, ofensivo, discriminatorio, sexual,
          violento, spam, estafas o datos personales de otras personas. Los mensajes pueden denunciarse y eliminarse, y las cuentas
          pueden ser bloqueadas.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Marcas">
        <p>
          EcoVerify es un proyecto independiente construido sobre la red Fone Protocol. Fone, Fone Protocol, Fone Wallet y sus
          logotipos pertenecen a sus respectivos titulares. EcoVerify no es operado por Fone y no responde por sus servicios, como
          Fone Wallet.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Tarjetas, suspensión y cierre">
        <LegalList
          items={[
            "Los intentos de fraude (foto de internet, foto de pantalla, foto reutilizada, ubicación falsificada, relato inventado) y las ofensas en la comunidad pueden recibir tarjeta. Un error honesto, como una foto oscura o estar fuera del lugar por equivocación, no recibe tarjeta: la prueba solo se rechaza con el motivo.",
            "Las tarjetas las da una persona del equipo, nunca automáticamente la inteligencia artificial, y siempre con una explicación escrita que recibes en la aplicación.",
            "Tarjeta amarilla: la 1ª y la 2ª son avisos. La 3ª amarilla válida suspende la cuenta por 14 días. Cada amarilla vale por 6 meses y después deja de contar.",
            "Durante la suspensión no puedes entrar en la aplicación y los FONE aún no pagados quedan congelados (guardados, no perdidos) hasta que termine la suspensión.",
            "Tarjeta roja: bloquea la cuenta. Se usa en casos graves o cuando hay un nuevo intento de fraude justo después de una suspensión, y la decide un administrador.",
            "Toda tarjeta puede apelarse una vez, en Perfil → Mis tarjetas. Una cuenta suspendida o bloqueada puede apelar desde la pantalla que aparece al intentar entrar. La apelación la revisa un administrador; si se acepta, la tarjeta se anula y la suspensión o el bloqueo se deshacen.",
            "También podemos cerrar misiones o el servicio, avisando con anticipación siempre que sea posible.",
          ]}
        />
      </LegalSection>

      <LegalSection n={9} title="Responsabilidad">
        <p>
          La aplicación se ofrece tal como está. Hacemos lo posible por mantenerla segura y disponible, pero no respondemos por
          fallas de la red Fone, de Fone Wallet, de internet o de tu dispositivo, ni por pérdidas derivadas de la variación del
          precio de FONE. Nada de esto limita los derechos que la ley te garantiza.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Cambios y contacto">
        <p>
          Cuando estos Términos cambien de forma relevante, te pediremos que aceptes la nueva versión al entrar en la aplicación.
          Dudas: {contactText(info.contactEmail, "es")}. Estos Términos se rigen por la legislación brasileña.
        </p>
      </LegalSection>
    </div>
  );
}
