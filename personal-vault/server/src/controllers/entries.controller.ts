import { Response } from 'express';
import { prisma } from '../utils/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  createEntrySchema,
  updateEntrySchema,
  paginationSchema,
  uuidParamSchema,
  validateBody,
} from '../utils/validation.js';

export async function getEntries(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const paginationValidation = validateBody(paginationSchema)(req.query);
  const page = paginationValidation.success ? paginationValidation.data.page : 1;
  const pageSize = paginationValidation.success ? paginationValidation.data.pageSize : 50;

  try {
    const [entries, total] = await Promise.all([
      prisma.vaultEntry.findMany({
        where: { userId: req.user.userId },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vaultEntry.count({
        where: { userId: req.user.userId },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        items: entries.map(entry => ({
          id: entry.id,
          type: entry.type,
          encryptedData: entry.encryptedData,
          folderId: entry.folderId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Get entries error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch entries',
    });
  }
}

export async function getEntry(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const paramValidation = validateBody(uuidParamSchema)(req.params);

  if (!paramValidation.success) {
    return res.status(400).json({
      success: false,
      error: paramValidation.error,
    });
  }

  try {
    const entry = await prisma.vaultEntry.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    return res.json({
      success: true,
      data: {
        id: entry.id,
        type: entry.type,
        encryptedData: entry.encryptedData,
        folderId: entry.folderId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch entry',
    });
  }
}

export async function createEntry(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const validation = validateBody(createEntrySchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { type, encryptedData, folderId } = validation.data;

  try {
    // Verify folder belongs to user if provided
    if (folderId) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.userId,
        },
      });

      if (!folder) {
        return res.status(400).json({
          success: false,
          error: 'Invalid folder',
        });
      }
    }

    const entry = await prisma.vaultEntry.create({
      data: {
        userId: req.user.userId,
        type,
        encryptedData,
        folderId: folderId || null,
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'create_entry',
        success: true,
        metadata: JSON.stringify({ entryId: entry.id, type }),
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: entry.id,
        type: entry.type,
        encryptedData: entry.encryptedData,
        folderId: entry.folderId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    console.error('Create entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create entry',
    });
  }
}

export async function updateEntry(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const paramValidation = validateBody(uuidParamSchema)(req.params);

  if (!paramValidation.success) {
    return res.status(400).json({
      success: false,
      error: paramValidation.error,
    });
  }

  const validation = validateBody(updateEntrySchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { encryptedData, folderId } = validation.data;

  try {
    // Check entry exists and belongs to user
    const existingEntry = await prisma.vaultEntry.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    // Verify folder belongs to user if provided
    if (folderId !== undefined && folderId !== null) {
      const folder = await prisma.folder.findFirst({
        where: {
          id: folderId,
          userId: req.user.userId,
        },
      });

      if (!folder) {
        return res.status(400).json({
          success: false,
          error: 'Invalid folder',
        });
      }
    }

    const entry = await prisma.vaultEntry.update({
      where: { id: paramValidation.data.id },
      data: {
        ...(encryptedData && { encryptedData }),
        ...(folderId !== undefined && { folderId }),
      },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'update_entry',
        success: true,
        metadata: JSON.stringify({ entryId: entry.id }),
      },
    });

    return res.json({
      success: true,
      data: {
        id: entry.id,
        type: entry.type,
        encryptedData: entry.encryptedData,
        folderId: entry.folderId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update entry',
    });
  }
}

export async function deleteEntry(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const paramValidation = validateBody(uuidParamSchema)(req.params);

  if (!paramValidation.success) {
    return res.status(400).json({
      success: false,
      error: paramValidation.error,
    });
  }

  try {
    // Check entry exists and belongs to user
    const existingEntry = await prisma.vaultEntry.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
    });

    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
    }

    await prisma.vaultEntry.delete({
      where: { id: paramValidation.data.id },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'delete_entry',
        success: true,
        metadata: JSON.stringify({ entryId: paramValidation.data.id }),
      },
    });

    return res.json({
      success: true,
      message: 'Entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete entry',
    });
  }
}
