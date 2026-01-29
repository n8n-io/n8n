import { Response } from 'express';
import { prisma } from '../utils/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import {
  createFolderSchema,
  updateFolderSchema,
  uuidParamSchema,
  validateBody,
} from '../utils/validation.js';

export async function getFolders(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const folders = await prisma.folder.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: folders.map(folder => ({
        id: folder.id,
        encryptedName: folder.encryptedName,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get folders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch folders',
    });
  }
}

export async function getFolder(req: AuthenticatedRequest, res: Response) {
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
    const folder = await prisma.folder.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
      include: {
        vaultEntries: true,
        children: true,
      },
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found',
      });
    }

    return res.json({
      success: true,
      data: {
        id: folder.id,
        encryptedName: folder.encryptedName,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
        entries: folder.vaultEntries.map(entry => ({
          id: entry.id,
          type: entry.type,
          encryptedData: entry.encryptedData,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        })),
        children: folder.children.map(child => ({
          id: child.id,
          encryptedName: child.encryptedName,
          createdAt: child.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get folder error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch folder',
    });
  }
}

export async function createFolder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const validation = validateBody(createFolderSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { encryptedName, parentId } = validation.data;

  try {
    // Verify parent folder belongs to user if provided
    if (parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          userId: req.user.userId,
        },
      });

      if (!parentFolder) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parent folder',
        });
      }
    }

    const folder = await prisma.folder.create({
      data: {
        userId: req.user.userId,
        encryptedName,
        parentId: parentId || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: folder.id,
        encryptedName: folder.encryptedName,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      },
    });
  } catch (error) {
    console.error('Create folder error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create folder',
    });
  }
}

export async function updateFolder(req: AuthenticatedRequest, res: Response) {
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

  const validation = validateBody(updateFolderSchema)(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  const { encryptedName, parentId } = validation.data;

  try {
    // Check folder exists and belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
    });

    if (!existingFolder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found',
      });
    }

    // Prevent setting parent to self
    if (parentId === paramValidation.data.id) {
      return res.status(400).json({
        success: false,
        error: 'Folder cannot be its own parent',
      });
    }

    // Verify parent folder belongs to user if provided
    if (parentId !== undefined && parentId !== null) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: parentId,
          userId: req.user.userId,
        },
      });

      if (!parentFolder) {
        return res.status(400).json({
          success: false,
          error: 'Invalid parent folder',
        });
      }

      // Prevent circular reference
      let currentParent = parentFolder;
      while (currentParent.parentId) {
        if (currentParent.parentId === paramValidation.data.id) {
          return res.status(400).json({
            success: false,
            error: 'Circular folder reference detected',
          });
        }
        const nextParent = await prisma.folder.findUnique({
          where: { id: currentParent.parentId },
        });
        if (!nextParent) break;
        currentParent = nextParent;
      }
    }

    const folder = await prisma.folder.update({
      where: { id: paramValidation.data.id },
      data: {
        ...(encryptedName && { encryptedName }),
        ...(parentId !== undefined && { parentId }),
      },
    });

    return res.json({
      success: true,
      data: {
        id: folder.id,
        encryptedName: folder.encryptedName,
        parentId: folder.parentId,
        createdAt: folder.createdAt,
      },
    });
  } catch (error) {
    console.error('Update folder error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update folder',
    });
  }
}

export async function deleteFolder(req: AuthenticatedRequest, res: Response) {
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
    // Check folder exists and belongs to user
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: paramValidation.data.id,
        userId: req.user.userId,
      },
    });

    if (!existingFolder) {
      return res.status(404).json({
        success: false,
        error: 'Folder not found',
      });
    }

    // Delete folder (entries will have folderId set to null due to onDelete: SetNull)
    await prisma.folder.delete({
      where: { id: paramValidation.data.id },
    });

    return res.json({
      success: true,
      message: 'Folder deleted successfully',
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete folder',
    });
  }
}
