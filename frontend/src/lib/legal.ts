import type { Locale } from "@/lib/local-engines";

export type LegalDoc = "terms" | "privacy" | "disclaimer" | "trademarks";

export const LEGAL_DOCS: LegalDoc[] = ["terms", "privacy", "disclaimer", "trademarks"];

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalPage {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const CONTACT = "cloud@volleyos.app";

export const LEGAL: Record<LegalDoc, Record<Locale, LegalPage>> = {
  terms: {
    es: {
      title: "Términos de servicio",
      updated: "2026-10-22",
      intro: "VolleyOS Global es software libre bajo AGPL-3.0-or-later. Al usarlo aceptás estos términos y la licencia.",
      sections: [
        {
          heading: "1. Licencia y garantía",
          paragraphs: [
            "El código se distribuye tal cual, sin garantía de ningún tipo. Podés usarlo, estudiarlo, modificarlo y redistribuirlo bajo AGPL-3.0-or-later.",
            "Las builds F-Droid son gratuitas y no requieren cuenta. Las builds Cloud agregan servicios de pago opcionales.",
          ],
        },
        {
          heading: "2. Pagos Cloud Pro",
          paragraphs: [
            "Los planes son pagos únicos por evento o suscripciones de club procesadas por Stripe. No almacenamos datos de tarjeta.",
            "El backend libera descargas solo tras verificar la firma HMAC-SHA256 del webhook de pago. Un pago rechazado no genera acceso.",
            `Reembolsos por fallas técnicas: escribí a ${CONTACT} dentro de los 14 días.`,
          ],
        },
        {
          heading: "3. Uso aceptable",
          paragraphs: [
            "No podés usar la API para spam, apuestas ilegales, scraping masivo ni para vulnerar derechos de terceros.",
            "Podemos suspender claves API ante abuso comprobado, sin afectar tu copia local del software.",
          ],
        },
        {
          heading: "4. Ley aplicable",
          paragraphs: ["Estos términos se rigen por las leyes de la República Argentina. Los conflictos se resuelven en sus tribunales ordinarios."],
        },
      ],
    },
    en: {
      title: "Terms of service",
      updated: "2026-10-22",
      intro: "VolleyOS Global is free software under AGPL-3.0-or-later. By using it you accept these terms and the licence.",
      sections: [
        {
          heading: "1. Licence and warranty",
          paragraphs: [
            "The code is provided as is, without warranty of any kind. You may use, study, modify and redistribute it under AGPL-3.0-or-later.",
            "F-Droid builds are free and require no account. Cloud builds add optional paid services.",
          ],
        },
        {
          heading: "2. Cloud Pro payments",
          paragraphs: [
            "Plans are one-time per-event payments or club subscriptions processed by Stripe. We never store card data.",
            "The backend releases downloads only after verifying the HMAC-SHA256 payment webhook signature. A declined payment grants no access.",
            `Technical-failure refunds: email ${CONTACT} within 14 days.`,
          ],
        },
        {
          heading: "3. Acceptable use",
          paragraphs: [
            "You may not use the API for spam, illegal betting, mass scraping, or to infringe third-party rights.",
            "We may suspend API keys for proven abuse without affecting your local copy of the software.",
          ],
        },
        {
          heading: "4. Governing law",
          paragraphs: ["These terms are governed by the laws of Argentina. Disputes are heard by its ordinary courts."],
        },
      ],
    },
    pt: {
      title: "Termos de serviço",
      updated: "2026-10-22",
      intro: "VolleyOS Global é software livre sob AGPL-3.0-or-later. Ao usá-lo você aceita estes termos e a licença.",
      sections: [
        {
          heading: "1. Licença e garantia",
          paragraphs: [
            "O código é fornecido como está, sem garantia de qualquer tipo. Você pode usá-lo, estudá-lo, modificá-lo e redistribuí-lo sob AGPL-3.0-or-later.",
            "As builds F-Droid são gratuitas e não exigem conta. As builds Cloud adicionam serviços pagos opcionais.",
          ],
        },
        {
          heading: "2. Pagamentos Cloud Pro",
          paragraphs: [
            "Os planos são pagamentos únicos por evento ou assinaturas de clube processadas pela Stripe. Nunca armazenamos dados de cartão.",
            "O backend libera downloads apenas após verificar a assinatura HMAC-SHA256 do webhook de pagamento. Pagamento recusado não gera acesso.",
            `Reembolsos por falha técnica: escreva para ${CONTACT} em até 14 dias.`,
          ],
        },
        {
          heading: "3. Uso aceitável",
          paragraphs: [
            "Você não pode usar a API para spam, apostas ilegais, scraping em massa ou para violar direitos de terceiros.",
            "Podemos suspender chaves de API por abuso comprovado, sem afetar sua cópia local do software.",
          ],
        },
        {
          heading: "4. Lei aplicável",
          paragraphs: ["Estes termos são regidos pelas leis da Argentina. Conflitos são resolvidos em seus tribunais ordinários."],
        },
      ],
    },
  },
  privacy: {
    es: {
      title: "Política de privacidad",
      updated: "2026-10-22",
      intro: "La regla es simple: tus datos de cancha se quedan en tu cancha. Cero telemetría, cero analytics, cero venta de datos.",
      sections: [
        {
          heading: "1. Lo que no recolectamos",
          paragraphs: [
            "No hay SDKs de analytics, publicidad, crash reporting ni rastreo de ubicación. No pedimos contactos, cámara ni micrófono para el uso básico.",
            "La app funciona completamente offline; las estaciones no hacen requests de red.",
          ],
        },
        {
          heading: "2. Datos locales y bóveda efímera",
          paragraphs: [
            "Los reportes guardados viven en localStorage de tu navegador. La barra de bóveda permite destruirlos con confirmación y emite un recibo UTC con hash local.",
            "Ese recibo no se envía a ningún servidor: es una prueba para vos.",
          ],
        },
        {
          heading: "3. Datos Cloud",
          paragraphs: [
            "Si contratás Cloud Pro guardamos email de contacto, identificador de pago de Stripe y metadatos del evento (fechas, canchas, exportes).",
            "Retención máxima: 90 días después del cierre del evento. No vendemos ni compartimos datos con anunciantes.",
            `Borrado anticipado: ${CONTACT}.`,
          ],
        },
        {
          heading: "4. Seguridad",
          paragraphs: [
            "TLS en tránsito, firmas HMAC-SHA256 para webhooks, headers no-store/nosniff/DENY/no-referrer y acceso mínimo a la base de datos.",
            "Ningún sistema es perfecto; reportá incidentes a " + CONTACT + " y publicaremos un aviso.",
          ],
        },
      ],
    },
    en: {
      title: "Privacy policy",
      updated: "2026-10-22",
      intro: "The rule is simple: your court data stays on your court. Zero telemetry, zero analytics, zero data sales.",
      sections: [
        {
          heading: "1. What we do not collect",
          paragraphs: [
            "No analytics, advertising, crash-reporting SDKs or location tracking. Basic use needs no contacts, camera or microphone.",
            "The app works fully offline; stations make no network requests.",
          ],
        },
        {
          heading: "2. Local data and the ephemeral vault",
          paragraphs: [
            "Saved reports live in your browser's localStorage. The vault bar destroys them after confirmation and emits a UTC receipt with a local hash.",
            "That receipt is never sent to a server: it is proof for you.",
          ],
        },
        {
          heading: "3. Cloud data",
          paragraphs: [
            "If you buy Cloud Pro we store a contact email, Stripe payment identifier and event metadata (dates, courts, exports).",
            "Maximum retention: 90 days after event close. We do not sell or share data with advertisers.",
            `Early deletion: ${CONTACT}.`,
          ],
        },
        {
          heading: "4. Security",
          paragraphs: [
            "TLS in transit, HMAC-SHA256 webhook signatures, no-store/nosniff/DENY/no-referrer headers and least-privilege database access.",
            `No system is perfect; report incidents to ${CONTACT} and we will publish an advisory.`,
          ],
        },
      ],
    },
    pt: {
      title: "Política de privacidade",
      updated: "2026-10-22",
      intro: "A regra é simples: os dados da sua quadra ficam na sua quadra. Zero telemetria, zero analytics, zero venda de dados.",
      sections: [
        {
          heading: "1. O que não coletamos",
          paragraphs: [
            "Sem SDKs de analytics, publicidade, crash reporting ou rastreamento de localização. O uso básico não pede contatos, câmera ou microfone.",
            "O app funciona totalmente offline; as estações não fazem requisições de rede.",
          ],
        },
        {
          heading: "2. Dados locais e cofre efêmero",
          paragraphs: [
            "Relatórios salvos ficam no localStorage do seu navegador. A barra do cofre os destrói após confirmação e emite um recibo UTC com hash local.",
            "Esse recibo nunca é enviado a um servidor: é uma prova para você.",
          ],
        },
        {
          heading: "3. Dados Cloud",
          paragraphs: [
            "Se você contratar Cloud Pro guardamos email de contato, identificador de pagamento da Stripe e metadados do evento (datas, quadras, exports).",
            "Retenção máxima: 90 dias após o encerramento do evento. Não vendemos nem compartilhamos dados com anunciantes.",
            `Exclusão antecipada: ${CONTACT}.`,
          ],
        },
        {
          heading: "4. Segurança",
          paragraphs: [
            "TLS em trânsito, assinaturas HMAC-SHA256 para webhooks, headers no-store/nosniff/DENY/no-referrer e acesso mínimo ao banco.",
            `Nenhum sistema é perfeito; reporte incidentes para ${CONTACT} e publicaremos um aviso.`,
          ],
        },
      ],
    },
  },
  disclaimer: {
    es: {
      title: "Aviso legal y descargo",
      updated: "2026-10-22",
      intro: "VolleyOS es una herramienta de apoyo. No reemplaza al árbitro, al médico ni al reglamento oficial.",
      sections: [
        {
          heading: "1. Arbitraje",
          paragraphs: [
            "Las decisiones de VAR y las validaciones de rotación son orientativas y se basan en una interpretación de las reglas FIVB. Solo el árbitro oficial tiene autoridad en cancha.",
            "Ante discrepancia, prevalece el reglamento oficial vigente y el criterio del cuerpo arbitral.",
          ],
        },
        {
          heading: "2. Salud y rendimiento",
          paragraphs: [
            "Los cálculos de biomecánica, tempo y ACWR son educativos. No constituyen diagnóstico, tratamiento ni consejo médico.",
            "Consultá a un profesional antes de cambiar cargas de entrenamiento o si hay dolor.",
          ],
        },
        {
          heading: "3. Datos y disponibilidad",
          paragraphs: [
            "Los ejemplos incluidos son ficticios. Verificá siempre los datos antes de usarlos en un torneo real.",
            "El software se ofrece sin garantía de disponibilidad ni exactitud. Hacé backups de tus exportes.",
          ],
        },
      ],
    },
    en: {
      title: "Legal notice and disclaimer",
      updated: "2026-10-22",
      intro: "VolleyOS is a support tool. It does not replace the referee, a doctor or the official rulebook.",
      sections: [
        {
          heading: "1. Refereeing",
          paragraphs: [
            "VAR decisions and rotation checks are advisory and based on an interpretation of FIVB rules. Only the official referee has authority on court.",
            "If there is a discrepancy, the current official rulebook and the refereeing staff prevail.",
          ],
        },
        {
          heading: "2. Health and performance",
          paragraphs: [
            "Biomechanics, tempo and ACWR calculations are educational. They are not diagnosis, treatment or medical advice.",
            "Consult a professional before changing training loads or if pain is present.",
          ],
        },
        {
          heading: "3. Data and availability",
          paragraphs: [
            "Built-in examples are fictional. Always verify data before using it in a real tournament.",
            "The software is provided without availability or accuracy warranty. Back up your exports.",
          ],
        },
      ],
    },
    pt: {
      title: "Aviso legal e isenção",
      updated: "2026-10-22",
      intro: "O VolleyOS é uma ferramenta de apoio. Não substitui o árbitro, o médico nem o regulamento oficial.",
      sections: [
        {
          heading: "1. Arbitragem",
          paragraphs: [
            "Decisões de VAR e validações de rotação são orientativas e baseadas em uma interpretação das regras FIVB. Apenas o árbitro oficial tem autoridade em quadra.",
            "Em caso de divergência, prevalecem o regulamento oficial vigente e o critério da arbitragem.",
          ],
        },
        {
          heading: "2. Saúde e desempenho",
          paragraphs: [
            "Cálculos de biomecânica, tempo e ACWR são educativos. Não constituem diagnóstico, tratamento nem conselho médico.",
            "Consulte um profissional antes de mudar cargas de treino ou se houver dor.",
          ],
        },
        {
          heading: "3. Dados e disponibilidade",
          paragraphs: [
            "Os exemplos incluídos são fictícios. Verifique sempre os dados antes de usá-los em um torneio real.",
            "O software é oferecido sem garantia de disponibilidade ou exatidão. Faça backup dos seus exports.",
          ],
        },
      ],
    },
  },
  trademarks: {
    es: {
      title: "Marcas y atribuciones",
      updated: "2026-10-22",
      intro: "VolleyOS no está afiliado, patrocinado ni endosado por ninguna federación, marca deportiva o proveedor mencionado.",
      sections: [
        {
          heading: "1. Nuestra marca",
          paragraphs: [
            "El nombre VolleyOS, el logo y la identidad visual son parte del proyecto libre. El código está bajo AGPL-3.0-or-later.",
            "Podés forkear y redistribuir el código; para usar la marca en un producto derivado, pedí permiso.",
          ],
        },
        {
          heading: "2. Marcas de terceros",
          paragraphs: [
            "FIVB, Mikasa, OBS, Stripe, Next.js, F-Droid y otras marcas pertenecen a sus titulares. Se usan de forma nominativa para describir compatibilidad o contexto.",
            "El uso de estas marcas no implica endoso ni afiliación.",
          ],
        },
        {
          heading: "3. Contenido y reclamos",
          paragraphs: [
            `Si sos titular de una marca o derecho y creés que hay un uso indebido, escribí a ${CONTACT} con la documentación. Respondemos en 5 días hábiles.`,
            "Las reglas citadas son referencias públicas; no reproducimos el texto completo del reglamento FIVB.",
          ],
        },
      ],
    },
    en: {
      title: "Trademarks and attribution",
      updated: "2026-10-22",
      intro: "VolleyOS is not affiliated with, sponsored by or endorsed by any federation, sports brand or vendor mentioned.",
      sections: [
        {
          heading: "1. Our mark",
          paragraphs: [
            "The VolleyOS name, logo and visual identity are part of the free project. Code is under AGPL-3.0-or-later.",
            "You may fork and redistribute the code; ask permission before using the mark in a derivative product.",
          ],
        },
        {
          heading: "2. Third-party marks",
          paragraphs: [
            "FIVB, Mikasa, OBS, Stripe, Next.js, F-Droid and other marks belong to their owners. They are used nominatively to describe compatibility or context.",
            "Such use does not imply endorsement or affiliation.",
          ],
        },
        {
          heading: "3. Content and claims",
          paragraphs: [
            `If you own a mark or right and believe it is misused, email ${CONTACT} with documentation. We reply within 5 business days.`,
            "Cited rules are public references; we do not reproduce the full FIVB rulebook.",
          ],
        },
      ],
    },
    pt: {
      title: "Marcas e atribuições",
      updated: "2026-10-22",
      intro: "O VolleyOS não é afiliado, patrocinado ou endossado por nenhuma federação, marca esportiva ou fornecedor mencionado.",
      sections: [
        {
          heading: "1. Nossa marca",
          paragraphs: [
            "O nome VolleyOS, o logo e a identidade visual fazem parte do projeto livre. O código está sob AGPL-3.0-or-later.",
            "Você pode fazer fork e redistribuir o código; peça permissão antes de usar a marca em um produto derivado.",
          ],
        },
        {
          heading: "2. Marcas de terceiros",
          paragraphs: [
            "FIVB, Mikasa, OBS, Stripe, Next.js, F-Droid e outras marcas pertencem aos seus titulares. São usadas de forma nominativa para descrever compatibilidade ou contexto.",
            "Esse uso não implica endosso nem afiliação.",
          ],
        },
        {
          heading: "3. Conteúdo e reclamações",
          paragraphs: [
            `Se você é titular de uma marca ou direito e acredita em uso indevido, escreva para ${CONTACT} com documentação. Respondemos em 5 dias úteis.`,
            "As regras citadas são referências públicas; não reproduzimos o texto completo do regulamento FIVB.",
          ],
        },
      ],
    },
  },
};

export function isLegalDoc(value: string): value is LegalDoc {
  return (LEGAL_DOCS as string[]).includes(value);
}
