import { useNavigate } from 'react-router-dom'
import { toWhatsAppNumber } from '@jaby/shared'
import { useStoreConfig } from '../hooks/useStoreConfig'
import Footer from '../components/Footer'
import styles from './PrivacyPage.module.css'

function PrivacyPage() {
  const navigate = useNavigate()
  const { data: config } = useStoreConfig()
  const storeName = config?.store_name || 'Antojos Ya'
  const whatsapp = toWhatsAppNumber(config?.whatsapp_number)
  const contactUrl = whatsapp ? `https://wa.me/${whatsapp}` : null

  return (
    <>
      <div className={styles.page}>
        <button className={styles.backLink} onClick={() => navigate(-1)}>
          <span aria-hidden="true">←</span> Volver
        </button>
        <h1 className={styles.title}>Política de privacidad</h1>
        <p className={styles.updated}>Última actualización: octubre de 2026</p>

        <h2>Quién es el responsable</h2>
        <p>
          {storeName} (el "Local") es responsable del tratamiento de los datos personales que se
          recolectan en este sitio.{' '}
          {contactUrl && (
            <>
              Podés contactarnos por{' '}
              <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              .
            </>
          )}
        </p>

        <h2>Qué datos recolectamos</h2>
        <p>
          Al confirmar un pedido te pedimos tu nombre, tu número de WhatsApp y, si elegís delivery,
          tu dirección. También guardamos el contenido del pedido, la modalidad elegida y las notas
          que quieras agregar. Los datos del carrito y tus favoritos se guardan solo en tu
          dispositivo.
        </p>

        <h2>Para qué los usamos</h2>
        <ul>
          <li>Gestionar, preparar y entregar tu pedido, y contactarte por él.</li>
          <li>Llevar un registro de clientes y pedidos del Local.</li>
          <li>
            Solo si lo aceptás de forma expresa y opcional al confirmar el pedido: enviarte novedades
            y promociones por WhatsApp.
          </li>
        </ul>
        <p>No vendemos tus datos ni los cedemos a terceros con fines propios de ellos.</p>

        <h2>Con quién se comparten</h2>
        <p>
          Usamos proveedores tecnológicos para operar el sitio (alojamiento y base de datos) y
          WhatsApp para comunicarnos con vos. Estos proveedores tratan los datos solo para prestarnos
          el servicio.
        </p>

        <h2>Cuánto tiempo los conservamos</h2>
        <p>
          Conservamos tus datos mientras sean necesarios para las finalidades indicadas o hasta que
          pidas su eliminación.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Podés acceder a tus datos, rectificarlos o actualizarlos, y solicitar su supresión, así como
          retirar en cualquier momento el consentimiento para recibir promociones. Escribinos
          {contactUrl ? ' por WhatsApp' : ''} indicando el teléfono con el que hiciste el pedido.
        </p>

        <div className={styles.legal}>
          El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los
          mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un
          interés legítimo al efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley
          N° 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de
          Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se
          interpongan con relación al incumplimiento de las normas sobre protección de datos
          personales.
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PrivacyPage
