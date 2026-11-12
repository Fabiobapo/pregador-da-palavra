// Sem SMTP_URL o e-mail é SIMULADO (aparece só no console do servidor). Não use isso em produção.
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_URL) {
    console.log(`[E-MAIL SIMULADO] Para: ${to}\n${subject}\n${text}`);
    return;
  }

  const nm = await import("nodemailer");
  await nm.createTransport(process.env.SMTP_URL).sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text,
  });
}
