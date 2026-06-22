import { google } from 'googleapis';

export const createMeetEvent = async (appointmentData, pharmacistEmail, patientEmail) => {
  try {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS ausente. Gerando Meet mockado.');
      return { hangoutLink: 'https://meet.google.com/mock-link-123', eventId: 'mock-event-id' };
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
        
    const startTime = new Date(appointmentData.dateTime);
    const endTime = new Date(startTime.getTime() + appointmentData.durationMinutes * 60000);

    const event = {
      summary: `Teleatendimento Farmacêutico - ${patientEmail.split('@')[0]}`,
      description: `Consulta agendada via plataforma Telefarmácia.\n\nPaciente: ${patientEmail}\nFarmacêutico: ${pharmacistEmail}`,
      start: { dateTime: startTime.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: endTime.toISOString(), timeZone: 'America/Sao_Paulo' },
      attendees: [{ email: patientEmail }, { email: pharmacistEmail }],
      conferenceData: {
        createRequest: {
          // RequestId único para forçar a geração de uma nova sala do Meet
          requestId: `meet-${appointmentData.id}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      resource: event,
      conferenceDataVersion: 1, // Obrigatório para o Meet funcionar
      sendUpdates: 'all', // Envia o convite para o email dos attendees
    });

    return { hangoutLink: response.data.hangoutLink, eventId: response.data.id };
  } catch (error) {
    console.error('❌ Erro na API do Google Calendar:', error.message);
    throw new Error('Falha ao criar sala no Google Meet.');
  }
};