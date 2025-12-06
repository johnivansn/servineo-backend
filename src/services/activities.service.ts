import { Types } from 'mongoose';
import { Activity, ActivityDoc } from '../models/activities.model';

function getAdjustedDate(date?: Date): Date {
  const now = date || new Date();
  const offset = -4;
  return new Date(now.getTime() + offset * 60 * 60 * 1000);
}

async function findExistingClick(
  userId: Types.ObjectId | string,
  jobId: string | Types.ObjectId,
): Promise<ActivityDoc | null> {
  const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const jobIdString = typeof jobId === 'string' ? jobId : jobId.toString();

  let existingClick = await Activity.findOne({
    userId: userIdObj,
    type: 'click',
    'metadata.jobId': jobIdString,
  })
    .lean()
    .exec();

  if (!existingClick) {
    try {
      const jobIdObj = new Types.ObjectId(jobIdString);
      existingClick = await Activity.findOne({
        userId: userIdObj,
        type: 'click',
        'metadata.jobId': jobIdObj,
      })
        .lean()
        .exec();
    } catch (e) {}
  }

  if (!existingClick) {
    existingClick = await Activity.findOne({
      userId: userIdObj,
      type: 'click',
      $expr: {
        $eq: [{ $toString: '$metadata.jobId' }, jobIdString],
      },
    })
      .lean()
      .exec();
  }

  return existingClick ? (existingClick as unknown as ActivityDoc) : null;
}

async function updateClickCountAtomically(
  userId: Types.ObjectId,
  jobId: string,
  newMetadata: any,
  role: 'visitor' | 'requester' | 'fixer',
  date?: Date,
): Promise<{ activity: ActivityDoc; isUpdate: boolean }> {
  const jobIdString = jobId;
  const timestamp = getAdjustedDate();
  const adjustedDate = date ? getAdjustedDate(new Date(date)) : getAdjustedDate();

  const normalizedMetadata = { ...newMetadata };
  if (normalizedMetadata.jobId) {
    normalizedMetadata.jobId =
      typeof normalizedMetadata.jobId === 'string'
        ? normalizedMetadata.jobId
        : normalizedMetadata.jobId.toString();
  }

  const metadataSetFields: any = {};
  Object.keys(normalizedMetadata).forEach((key) => {
    if (key !== 'clickCount' && key !== 'jobId') {
      metadataSetFields[`metadata.${key}`] = normalizedMetadata[key];
    }
  });

  const pipelineUpdate = [
    {
      $set: {
        userId: { $ifNull: ['$userId', userId] },
        date: { $ifNull: ['$date', adjustedDate] },
        role: { $ifNull: ['$role', role] },
        type: { $ifNull: ['$type', 'click'] },
        timestamp: timestamp,
        'metadata.jobId': jobIdString,
        ...Object.keys(metadataSetFields).reduce((acc, key) => {
          acc[key] = { $ifNull: [`$${key}`, metadataSetFields[key]] };
          return acc;
        }, {} as any),
        'metadata.clickCount': {
          $cond: {
            if: { $gt: [{ $ifNull: ['$metadata.clickCount', 0] }, 0] },
            then: { $add: [{ $ifNull: ['$metadata.clickCount', 0] }, 1] },
            else: 1,
          },
        },
      },
    },
  ];

  let upsertResult = await Activity.findOneAndUpdate(
    {
      userId: userId,
      type: 'click',
      'metadata.jobId': jobIdString,
    } as any,
    pipelineUpdate,
    { new: true, lean: true, upsert: true },
  ).exec();

  if (!upsertResult) {
    try {
      const jobIdObj = new Types.ObjectId(jobIdString);
      upsertResult = await Activity.findOneAndUpdate(
        {
          userId: userId,
          type: 'click',
          'metadata.jobId': jobIdObj,
        } as any,
        pipelineUpdate,
        { new: true, lean: true, upsert: true },
      ).exec();
    } catch (e) {}
  }

  if (!upsertResult) {
    const existing = await Activity.findOne({
      userId: userId,
      type: 'click',
      $expr: {
        $eq: [{ $toString: '$metadata.jobId' }, jobIdString],
      },
    } as any).exec();

    if (existing) {
      upsertResult = await Activity.findByIdAndUpdate(
        existing._id,
        {
          $inc: { 'metadata.clickCount': 1 },
          $set: {
            timestamp: timestamp,
            date: adjustedDate,
            role: role,
            'metadata.jobId': jobIdString,
            ...metadataSetFields,
          },
        },
        { new: true, lean: true },
      ).exec();
    }
  }

  if (!upsertResult) {
    throw new Error('Failed to create or update activity');
  }

  const finalResult = upsertResult as any;
  const clickCount = finalResult?.metadata?.clickCount || 0;
  const isUpdate = clickCount > 1;

  return {
    activity: finalResult as unknown as ActivityDoc,
    isUpdate: isUpdate,
  };
}

async function createNewActivity(activityData: {
  userId: Types.ObjectId | string;
  date?: Date;
  role: 'visitor' | 'requester' | 'fixer';
  type: 'login' | 'search' | 'click' | 'review' | 'session_start' | 'session_end';
  metadata: any;
}): Promise<ActivityDoc> {
  const userIdObj =
    typeof activityData.userId === 'string'
      ? new Types.ObjectId(activityData.userId)
      : activityData.userId;

  const timestamp = getAdjustedDate();
  const date = activityData.date ? getAdjustedDate(new Date(activityData.date)) : getAdjustedDate();

  const normalizedMetadata = { ...activityData.metadata };
  if (normalizedMetadata.jobId) {
    normalizedMetadata.jobId =
      typeof normalizedMetadata.jobId === 'string'
        ? normalizedMetadata.jobId
        : normalizedMetadata.jobId.toString();
  }

  const newActivity = new Activity({
    userId: userIdObj,
    date,
    role: activityData.role,
    type: activityData.type,
    metadata: {
      ...normalizedMetadata,
      clickCount:
        activityData.type === 'click' && normalizedMetadata.jobId
          ? 1
          : normalizedMetadata.clickCount || 0,
    },
    timestamp,
  });

  const savedActivity = await newActivity.save();
  return savedActivity.toObject() as ActivityDoc;
}

export async function createSimpleActivity(activityData: {
  userId: Types.ObjectId | string;
  date?: Date;
  role: 'visitor' | 'requester' | 'fixer';
  type: 'login' | 'search' | 'click' | 'review' | 'session_start' | 'session_end';
  metadata: any;
}): Promise<ActivityDoc> {
  const userIdObj =
    typeof activityData.userId === 'string'
      ? new Types.ObjectId(activityData.userId)
      : activityData.userId;

  const timestamp = getAdjustedDate();
  const date = activityData.date ? getAdjustedDate(new Date(activityData.date)) : getAdjustedDate();

  const newActivity = new Activity({
    userId: userIdObj,
    date,
    role: activityData.role,
    type: activityData.type,
    metadata: {
      ...activityData.metadata,
    },
    timestamp,
  });

  const savedActivity = await newActivity.save();
  return savedActivity.toObject() as ActivityDoc;
}

export async function createActivity(activityData: {
  userId: Types.ObjectId | string;
  date?: Date;
  role: 'visitor' | 'requester' | 'fixer';
  type: 'login' | 'search' | 'click' | 'review' | 'session_start' | 'session_end';
  metadata: any;
}): Promise<{ activity: ActivityDoc; isUpdate: boolean }> {
  if (activityData.type === 'click' && activityData.metadata?.jobId) {
    const userIdObj =
      typeof activityData.userId === 'string'
        ? new Types.ObjectId(activityData.userId)
        : activityData.userId;

    const jobId =
      typeof activityData.metadata.jobId === 'string'
        ? activityData.metadata.jobId
        : activityData.metadata.jobId.toString();

    return await updateClickCountAtomically(
      userIdObj,
      jobId,
      activityData.metadata,
      activityData.role,
      activityData.date,
    );
  }

  const newActivity = await createNewActivity(activityData);

  return {
    activity: newActivity,
    isUpdate: false,
  };
}

export async function getActivities(): Promise<ActivityDoc[]> {
  const activities = await Activity.find({}).lean().exec();
  return activities as unknown as ActivityDoc[];
}
