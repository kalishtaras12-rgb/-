import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CAPPONI_ITEMS, DEMBO_SCALES, SPIELBERGER_ITEMS } from './data/methodologies';
import type { Demographics, RespondentRecord, SurveyAnswers } from './types/research';
import { computeScores, generateSampleCohort } from './utils/scoring';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const ADMIN_EMAIL = 'kalishtaras12@gmail.com';

export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  return Boolean(
    user.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGoogleAdmin(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutAccount(): Promise<void> {
  await signOut(auth);
}

function sanitizeAnswersForFirestore(answers: SurveyAnswers) {
  const capponi: Record<string, number> = {};
  for (const item of CAPPONI_ITEMS) {
    const val = Math.round(Number(answers.capponi[item.id] ?? 3));
    capponi[String(item.id)] = Math.max(1, Math.min(5, val));
  }

  const dembo: Record<string, { real: number; aspiration: number }> = {};
  for (const scale of DEMBO_SCALES) {
    const entry = answers.dembo[scale.id] ?? { real: 5, aspiration: 7 };
    dembo[scale.id] = {
      real: Math.max(1, Math.min(10, Math.round(Number(entry.real)))),
      aspiration: Math.max(1, Math.min(10, Math.round(Number(entry.aspiration)))),
    };
  }

  const spielberger: Record<string, number> = {};
  for (const item of SPIELBERGER_ITEMS) {
    const val = Math.round(Number(answers.spielberger[item.id] ?? 2));
    spielberger[String(item.id)] = Math.max(1, Math.min(4, val));
  }

  return { capponi, dembo, spielberger };
}

export async function saveRespondentToFirestore(
  demographics: Demographics,
  rawAnswers: SurveyAnswers
): Promise<RespondentRecord> {
  const docId = `resp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanAnswers = sanitizeAnswersForFirestore(rawAnswers);
  const typedAnswers: SurveyAnswers = {
    capponi: Object.fromEntries(
      Object.entries(cleanAnswers.capponi).map(([k, v]) => [Number(k), v])
    ),
    dembo: cleanAnswers.dembo,
    spielberger: Object.fromEntries(
      Object.entries(cleanAnswers.spielberger).map(([k, v]) => [Number(k), v])
    ),
  };

  const cleanDemographics: Demographics = {
    code: (demographics.code?.trim() || `Р-${String(Date.now()).slice(-4)}`).slice(0, 32),
    gender: demographics.gender || 'Не вказано',
    age: Math.max(16, Math.min(80, Math.round(Number(demographics.age) || 19))),
    specialty: (demographics.specialty?.trim() || '2 курс, спеціальність «Психологія»').slice(
      0,
      120
    ),
  };

  const scores = computeScores(typedAnswers);
  const firestorePayload = {
    id: docId,
    createdAt: serverTimestamp(),
    demographics: cleanDemographics,
    answers: cleanAnswers,
    scores,
  };

  const docPath = `respondents/${docId}`;
  try {
    await setDoc(doc(db, 'respondents', docId), firestorePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    id: docId,
    createdAt: new Date().toISOString(),
    demographics: cleanDemographics,
    answers: typedAnswers,
    scores,
  };
}

export function subscribeRespondentsForAdmin(
  onData: (records: RespondentRecord[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = 'respondents';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records: RespondentRecord[] = snapshot.docs.map((snap) => {
        const data = snap.data();
        let createdAtIso = new Date().toISOString();
        if (data.createdAt instanceof Timestamp) {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          createdAtIso = data.createdAt;
        }
        return {
          id: snap.id,
          createdAt: createdAtIso,
          demographics: data.demographics,
          answers: data.answers,
          scores: data.scores,
        } as RespondentRecord;
      });
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function seedSampleCohortToFirestore(
  count = 18,
  existingCount = 0
): Promise<void> {
  const samples = generateSampleCohort(count, existingCount);
  const batch = writeBatch(db);

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const docId = `sample_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
    const cleanAnswers = sanitizeAnswersForFirestore(sample.answers);
    const ref = doc(db, 'respondents', docId);
    batch.set(ref, {
      id: docId,
      createdAt: serverTimestamp(),
      demographics: {
        code: sample.demographics.code,
        gender: sample.demographics.gender,
        age: sample.demographics.age,
        specialty: sample.demographics.specialty,
      },
      answers: cleanAnswers,
      scores: sample.scores,
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'respondents');
  }
}

export async function deleteRespondentFromFirestore(id: string): Promise<void> {
  const docPath = `respondents/${id}`;
  try {
    await deleteDoc(doc(db, 'respondents', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function clearAllRespondentsFromFirestore(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.delete(doc(db, 'respondents', id));
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'respondents');
  }
}
