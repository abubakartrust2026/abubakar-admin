const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

const normalizePhone = (phone) => (phone || '').replace(/[\s-()]/g, '');

/**
 * Send a WhatsApp template message via Meta WhatsApp Cloud API.
 * @param {string} toPhone - recipient phone number
 * @param {object} params - { studentName, date, status }
 * @returns {Promise<{success: boolean, phone: string, error?: string}>}
 */
export const sendWhatsAppMessage = async (toPhone, params) => {
  const phone = normalizePhone(toPhone);

  if (!PHONE_REGEX.test(phone)) {
    return { success: false, phone: toPhone, error: 'Invalid or missing phone number', invalidPhone: true };
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;

  if (!accessToken || !phoneNumberId || !templateName) {
    return { success: false, phone, error: 'WhatsApp integration is not configured' };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: params.studentName },
                { type: 'text', text: params.date },
                { type: 'text', text: params.status },
              ],
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, phone, error: `WhatsApp API error: ${errorBody}` };
    }

    return { success: true, phone };
  } catch (error) {
    return { success: false, phone, error: error.message };
  }
};

/**
 * Notify parents about attendance for a set of populated Attendance records.
 * Skips students whose parent has no valid phone number. Never throws.
 * @param {Array} attendanceRecords - Attendance docs populated with `student.parent`
 * @returns {Promise<{sent: number, skipped: number, failed: number}>}
 */
export const notifyParentsOfAttendance = async (attendanceRecords) => {
  const summary = { sent: 0, skipped: 0, failed: 0 };

  const sendResults = await Promise.allSettled(
    attendanceRecords.map(async (record) => {
      const parent = record.student?.parent;
      const studentName = `${record.student?.firstName || ''} ${record.student?.lastName || ''}`.trim();

      if (!parent?.phone) {
        return { success: false, invalidPhone: true };
      }

      return sendWhatsAppMessage(parent.phone, {
        studentName,
        date: new Date(record.date).toLocaleDateString(),
        status: record.status,
      });
    })
  );

  for (const result of sendResults) {
    if (result.status !== 'fulfilled') {
      summary.failed += 1;
      continue;
    }
    const value = result.value;
    if (value.success) summary.sent += 1;
    else if (value.invalidPhone) summary.skipped += 1;
    else summary.failed += 1;
  }

  return summary;
};
