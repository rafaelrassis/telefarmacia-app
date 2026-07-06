-- Remove legacy Appointment-based booking flow (Stripe-like PIX + Google Meet).
-- The per-pharmacist agenda (Availability/WeeklySchedule/BloqueioAgenda) is kept —
-- it now backs the farmacêutico's own schedule/block management, not this flow.
-- The single patient-facing consultation flow is the queue system (FilaAgendada/FilaUrgente).

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_pharmacistId_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_appointmentId_fkey";

-- DropIndex
DROP INDEX "Avaliacao_appointmentId_key";

-- AlterTable
ALTER TABLE "Avaliacao" DROP COLUMN "appointmentId";

-- AlterTable
ALTER TABLE "PharmacistProfile" DROP COLUMN "calendarEmbedUrl";

-- DropTable
DROP TABLE "Appointment";

-- DropEnum
DROP TYPE "AppointmentStatus";
