-- Remove legacy per-pharmacist booking flow: Appointment, Availability, WeeklySchedule,
-- AppointmentStatus enum, PharmacistProfile.calendarEmbedUrl, and Avaliacao.appointmentId.
-- The single consultation flow going forward is the queue system (FilaAgendada/FilaUrgente).

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_pharmacistId_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_pharmacistId_fkey";

-- DropForeignKey
ALTER TABLE "Avaliacao" DROP CONSTRAINT "Avaliacao_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklySchedule" DROP CONSTRAINT "WeeklySchedule_pharmacistId_fkey";

-- DropIndex
DROP INDEX "Avaliacao_appointmentId_key";

-- AlterTable
ALTER TABLE "Avaliacao" DROP COLUMN "appointmentId";

-- AlterTable
ALTER TABLE "PharmacistProfile" DROP COLUMN "calendarEmbedUrl";

-- DropTable
DROP TABLE "Appointment";

-- DropTable
DROP TABLE "Availability";

-- DropTable
DROP TABLE "WeeklySchedule";

-- DropEnum
DROP TYPE "AppointmentStatus";

