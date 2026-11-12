import { onAuthStateChanged, type User } from 'firebase/auth';
import { LogOut, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CourseworkReportView } from './components/CourseworkReportView';
import { RespondentRegistry } from './components/RespondentRegistry';
import { SurveyFlow } from './components/SurveyFlow';
import { TopNav, type ActiveTab } from './components/TopNav';
import {
  ADMIN_EMAIL,
  auth,
  clearAllRespondentsFromFirestore,
  deleteRespondentFromFirestore,
  isAdminUser,
  saveRespondentToFirestore,
  seedSampleCohortToFirestore,
  signInWithGoogleAdmin,
  signOutAccount,
  subscribeRespondentsForAdmin,
} from './firebase';
import type { Demographics, RespondentRecord, SurveyAnswers } from './types/research';
import { exportResearchToExcel } from './utils/excelExport';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('survey');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [respondents, setRespondents] = useState<RespondentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAdmin = isAdminUser(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!isAdminUser(currentUser)) {
        setRespondents([]);
        setActiveTab('survey');
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!authReady || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const unsubscribe = subscribeRespondentsForAdmin(
      (records) => {
        setRespondents(records);
        setLoading(false);
      },
      (err) => {
        setErrorMsg(err.message || 'Помилка завантаження даних із Firestore');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [authReady, isAdmin]);

  const handleSignInGoogle = async () => {
    setErrorMsg(null);
    setSigningIn(true);
    try {
      const signedUser = await signInWithGoogleAdmin();
      if (isAdminUser(signedUser)) {
        setActiveTab('registry');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Не вдалося виконати вхід через Google.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAccount();
    setActiveTab('survey');
    setErrorMsg(null);
  };

  const handleSelectTab = (tab: ActiveTab) => {
    if (!isAdmin && tab !== 'survey') {
      setActiveTab('survey');
      return;
    }
    setActiveTab(tab);
  };

  const handleSubmitSurvey = async (
    demographics: Demographics,
    answers: SurveyAnswers
  ): Promise<RespondentRecord> => {
    return saveRespondentToFirestore(demographics, answers);
  };

  const handleSeedSample = async () => {
    if (!isAdmin) return;
    setErrorMsg(null);
    try {
      await seedSampleCohortToFirestore(18, respondents.length);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Помилка генерації тестової вибірки');
    }
  };

  const handleDeleteRespondent = async (id: string) => {
    if (!isAdmin) return;
    setErrorMsg(null);
    try {
      await deleteRespondentFromFirestore(id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Помилка видалення запису');
    }
  };

  const handleClearAll = async () => {
    if (!isAdmin) return;
    setErrorMsg(null);
    try {
      await clearAllRespondentsFromFirestore(respondents.map((r) => r.id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Помилка очищення бази');
    }
  };

  const handleExportExcel = () => {
    if (!isAdmin || respondents.length === 0) return;
    exportResearchToExcel(respondents);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopNav
        activeTab={isAdmin ? activeTab : 'survey'}
        onSelectTab={handleSelectTab}
        isAdmin={isAdmin}
        respondentCount={respondents.length}
        onExportExcel={handleExportExcel}
        onSignInGoogle={handleSignInGoogle}
        signingIn={signingIn}
      />

      {/* Compact Researcher/Auth Bar (only shown when signed into Google) */}
      {user && (
        <div className="border-b border-slate-200 bg-white no-print">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-slate-600">
              {isAdmin ? (
                <>
                  <span className="font-semibold text-slate-900">Адміністратор:</span>
                  <span className="font-mono">{user.email}</span>
                  <span>·</span>
                  <span>Повний доступ до звітності, аналітики та експорту в Excel</span>
                </>
              ) : (
                <div className="flex items-center gap-2 text-amber-800">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Акаунт <span className="font-mono font-semibold">{user.email}</span> не має прав
                    адміністратора ({ADMIN_EMAIL}). Доступно лише тестування.
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <LogOut className="h-3 w-3" aria-hidden="true" />
              <span>Вийти</span>
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {errorMsg && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {errorMsg}
          </div>
        )}

        {(!isAdmin || activeTab === 'survey') && (
          <SurveyFlow onSubmitSurvey={handleSubmitSurvey} />
        )}

        {isAdmin && activeTab === 'registry' && (
          <RespondentRegistry
            respondents={respondents}
            loading={loading}
            onDeleteRespondent={handleDeleteRespondent}
            onClearAll={handleClearAll}
            onSeedSample={handleSeedSample}
            onGoToSurvey={() => setActiveTab('survey')}
            onExportExcel={handleExportExcel}
          />
        )}

        {isAdmin && activeTab === 'analytics' && (
          <AnalyticsDashboard
            respondents={respondents}
            onSeedSample={handleSeedSample}
            onGoToSurvey={() => setActiveTab('survey')}
          />
        )}

        {isAdmin && activeTab === 'report' && (
          <CourseworkReportView
            respondents={respondents}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        Платформа емпіричного дослідження · Спеціальність «Психологія» · Анонімне тестування
      </footer>
    </div>
  );
}
