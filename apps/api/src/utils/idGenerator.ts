// ============================================================================
// 🆔 ID GENERATOR UTILITY - Generate permanent Healtara identity codes
// ============================================================================
// This utility generates unique, human-readable IDs for doctors, hospitals, and staff
// Format: HLT-{TYPE}-{6 alphanumeric chars}
// Examples: HLT-DOC-8F29A1, HLT-HOS-4C82B1, HLT-STA-72B491
// ============================================================================

import { prisma } from '../db';

/**
 * Generate a random 6-character alphanumeric code
 */
function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a unique doctor code (HLT-DOC-XXXXXX)
 * Checks database to ensure uniqueness
 */
export async function generateDoctorCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = `HLT-DOC-${generateRandomCode()}`;
    
    // Check if code already exists
    const existing = await prisma.user.findFirst({
      where: { doctorCode: code }
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  // If we couldn't generate a unique code after 10 attempts, use timestamp
  return `HLT-DOC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Generate a unique hospital code (HLT-HOS-XXXXXX)
 * Checks database to ensure uniqueness
 */
export async function generateHospitalCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = `HLT-HOS-${generateRandomCode()}`;
    
    // Check if code already exists
    const existing = await prisma.hospital.findFirst({
      where: { hospitalCode: code }
    });

    if (!existing) {
      return code;
    }

    attempts++;
  }

  // Fallback to timestamp-based code
  return `HLT-HOS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Generate a unique staff code (HLT-STA-XXXXXX)
 * Checks database to ensure uniqueness
 */
export async function generateStaffCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = `HLT-STA-${generateRandomCode()}`;
    
    // Check if code already exists in users table
    const existingUser = await prisma.user.findFirst({
      where: { staffCode: code }
    });

    // Also check staff_profiles table
    const existingProfile = await prisma.staffProfile.findFirst({
      where: { staffCode: code }
    });

    if (!existingUser && !existingProfile) {
      return code;
    }

    attempts++;
  }

  // Fallback to timestamp-based code
  return `HLT-STA-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Validate if a code follows the correct format
 */
export function validateCodeFormat(code: string, type: 'DOC' | 'HOS' | 'STA'): boolean {
  const regex = new RegExp(`^HLT-${type}-[A-Z0-9]{6}$`);
  return regex.test(code);
}

/**
 * Extract type from a Healtara ID code
 */
export function getCodeType(code: string): 'DOC' | 'HOS' | 'STA' | null {
  if (code.startsWith('HLT-DOC-')) return 'DOC';
  if (code.startsWith('HLT-HOS-')) return 'HOS';
  if (code.startsWith('HLT-STA-')) return 'STA';
  return null;
}

/**
 * Ensure a user has the appropriate code based on their role
 * Used when migrating existing users or fixing missing codes
 */
export async function ensureUserHasCode(userId: number): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, doctorCode: true, staffCode: true }
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Generate doctor code if missing
  if (user.role === 'DOCTOR' && !user.doctorCode) {
    const doctorCode = await generateDoctorCode();
    await prisma.user.update({
      where: { id: userId },
      data: { doctorCode }
    });
    console.log(`✅ Generated doctor code for user ${userId}: ${doctorCode}`);
  }

  // Generate staff code if missing
  if (user.role === 'SLOT_ADMIN' && !user.staffCode) {
    const staffCode = await generateStaffCode();
    await prisma.user.update({
      where: { id: userId },
      data: { staffCode }
    });
    console.log(`✅ Generated staff code for user ${userId}: ${staffCode}`);
  }
}

/**
 * Ensure a hospital has a code
 */
export async function ensureHospitalHasCode(hospitalId: number): Promise<void> {
  const hospital = await prisma.hospital.findUnique({
    where: { id: hospitalId },
    select: { id: true, hospitalCode: true }
  });

  if (!hospital) {
    throw new Error(`Hospital ${hospitalId} not found`);
  }

  if (!hospital.hospitalCode) {
    const hospitalCode = await generateHospitalCode();
    await prisma.hospital.update({
      where: { id: hospitalId },
      data: { hospitalCode }
    });
    console.log(`✅ Generated hospital code for hospital ${hospitalId}: ${hospitalCode}`);
  }
}
