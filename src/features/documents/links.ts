/** Liens vers les documents imprimables (ouvrir dans un nouvel onglet, puis « Imprimer / PDF »). */
export const printHref = {
  convention: (applicationId: string) => `/print/convention/${applicationId}`,
  convocation: (applicationId: string) => `/print/convocation/${applicationId}`,
  attestation: (applicationId: string) => `/print/attestation/${applicationId}`,
  emargement: (eventId: string) => `/print/emargement/${eventId}`,
  programme: (eventId: string) => `/print/programme/${eventId}`,
};
