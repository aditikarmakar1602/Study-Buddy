import React, { useState, useEffect } from 'react';
import api from '../../axios';
import jsPDF from 'jspdf';

interface DailyPlan {
  day: string;
  tasks: string[];
}

interface WeeklyPlan {
  week: string;
  focus: string;
  goals: string[];
}

interface Revision {
  date: string;
  subject: string;
  topic: string;
}

interface StudyPlan {
  title: string;
  dailyPlan: DailyPlan[];
  weeklyPlan: WeeklyPlan[];
  revisionSchedule: Revision[];
}

export default function StudyPlanner() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [saveToAccount, setSaveToAccount] = useState(true);

  useEffect(() => {
    const fetchLatestPlan = async () => {
      try {
        const res = await api.get('/planner/latest');
        setPlan(res.data);
      } catch (err) {
        // It's okay if no plan is found initially
      } finally {
        setIsLoading(false);
      }
    };
    fetchLatestPlan();
  }, []);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.post('/planner', {
        title,
        examDate,
        subjects: subjects.split(',').map(s => s.trim()),
        hoursPerDay,
        save: saveToAccount,
      }, { timeout: 600000 });
      setPlan(res.data);
    } catch (err: any) {
      console.error('[DEBUG Frontend] Planner Error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      if (errorMsg?.toLowerCase().includes('rate limit') || errorMsg?.includes('429')) {
        setError('AI service is currently busy. Your request has been queued and will automatically retry.');
      } else if (errorMsg?.includes('timeout')) {
        setError('Request timed out. Try again.');
      } else {
        setError(errorMsg || 'Failed to generate study plan.');
      }
    }
    setIsLoading(false);
  };

  const handleExportPdf = () => {
    if (!plan) return;

    setIsLoading(true);

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;
    let pageNumber = 1;

    const addHeaderFooter = () => {
      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(30, 64, 175);
      pdf.text("StudyBuddy AI - Study Plan", margin, yPosition);
      yPosition += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      const dateStr = new Date().toLocaleString();
      pdf.text(`Exported: ${dateStr}`, margin, yPosition);
      yPosition += 10;

      // Footer
      pdf.setFontSize(8);
      pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    };

    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        pageNumber++;
        yPosition = margin;
        addHeaderFooter();
      }
    };

    addHeaderFooter();

    // Plan Title
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42);
    const titleLines = pdf.splitTextToSize(plan.title, contentWidth);
    checkPageBreak(titleLines.length * 10 + 10);
    pdf.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += titleLines.length * 10 + 10;

    // --- Weekly Overview ---
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    checkPageBreak(12);
    pdf.text("Weekly Overview", margin, yPosition);
    yPosition += 8;

    plan.weeklyPlan.forEach(week => {
      const weekBlockHeight = (pdf.splitTextToSize(week.focus, contentWidth - 5).length + week.goals.length) * 5 + 15;
      checkPageBreak(weekBlockHeight);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(`• ${week.week}:`, margin, yPosition);
      yPosition += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Focus: ${week.focus}`, margin + 5, yPosition, { maxWidth: contentWidth - 5 });
      yPosition += pdf.splitTextToSize(week.focus, contentWidth - 5).length * 5 + 2;
      week.goals.forEach(goal => {
        pdf.text(`- ${goal}`, margin + 7, yPosition, { maxWidth: contentWidth - 7 });
        yPosition += 5;
      });
      yPosition += 5;
    });

    // --- Revision Schedule ---
    yPosition += 5;
    checkPageBreak(12);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Final Revision Schedule", margin, yPosition);
    yPosition += 8;

    plan.revisionSchedule.forEach(rev => {
      const revLine = `${rev.date} | ${rev.subject}: ${rev.topic}`;
      const revLines = pdf.splitTextToSize(revLine, contentWidth);
      checkPageBreak(revLines.length * 5 + 4);
      pdf.setFontSize(10);
      pdf.text(revLines, margin, yPosition);
      yPosition += revLines.length * 5 + 4;
    });

    // --- Daily Tasks ---
    yPosition += 5;
    checkPageBreak(12);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Daily Tasks", margin, yPosition);
    yPosition += 8;

    plan.dailyPlan.forEach(day => {
      const dayTitle = new Date(day.day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const tasksHeight = day.tasks.map(t => pdf.splitTextToSize(t, contentWidth - 5).length).reduce((a, b) => a + b, 0) * 5;
      checkPageBreak(tasksHeight + 15);
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text(dayTitle, margin, yPosition);
      yPosition += 7;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      day.tasks.forEach(task => {
        const taskLines = pdf.splitTextToSize(`- ${task}`, contentWidth - 5);
        pdf.text(taskLines, margin + 5, yPosition);
        yPosition += taskLines.length * 5;
      });
      yPosition += 5;
    });

    pdf.save(`${plan.title.replace(/ /g, '_') || 'study-plan'}.pdf`);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto bg-surface p-6 md:p-10 rounded-3xl shadow-2xl border border-card mt-12 mx-4 md:mx-auto animate-fade-in">
        <h2 className="text-3xl font-black text-textPrimary tracking-tight mb-8">Create Your AI Study Plan</h2>
        {error && <p className="text-danger bg-danger/10 border border-danger/20 p-4 rounded-xl mb-6 font-bold">{error}</p>}
        <form onSubmit={handleGeneratePlan} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Plan Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="block w-full px-5 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" placeholder="e.g., Final Exams Prep" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Exam Date</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} required className="block w-full px-5 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Subjects (comma-separated)</label>
            <input type="text" value={subjects} onChange={e => setSubjects(e.target.value)} required className="block w-full px-5 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" placeholder="e.g., Math, History, Science" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-textSecondary mb-2">Study Hours per Day</label>
            <input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} min="1" max="12" required className="block w-full px-5 py-3 bg-background border border-card rounded-xl text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted" />
          </div>
          <div className="flex items-center justify-start space-x-3 pt-2">
            <input type="checkbox" id="savePlanner" checked={saveToAccount} onChange={e => setSaveToAccount(e.target.checked)} className="w-5 h-5 text-primary bg-background border-card rounded focus:ring-primary focus:ring-2 cursor-pointer" />
            <label htmlFor="savePlanner" className="text-sm font-bold text-textSecondary cursor-pointer select-none">Save to my account</label>
          </div>
          <button type="submit" disabled={isLoading} className="w-full px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover hover:-translate-y-1 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
            {isLoading ? 'Generating Plan...' : 'Generate Plan with AI'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-7xl mx-auto p-6 md:p-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
        <h1 className="text-4xl font-black text-textPrimary tracking-tight">{plan.title}</h1>
        <div className="flex gap-4">
          <button onClick={handleExportPdf} className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover font-bold transition-all shadow-md">Export PDF</button>
          <button onClick={() => setPlan(null)} className="px-6 py-3 bg-surface border border-card rounded-xl hover:border-primary/50 text-textPrimary font-bold transition-all shadow-sm">Create New Plan</button>
        </div>
      </div>

      {/* Weekly Plan */}
      <section>
        <h2 className="text-2xl font-bold text-textPrimary mb-6 border-b border-card pb-4">Weekly Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plan.weeklyPlan.map((week, i) => (
            <div key={i} className="bg-surface p-6 rounded-2xl shadow-lg border border-card">
              <h3 className="font-bold text-primary text-lg">{week.week}</h3>
              <p className="text-sm text-textSecondary mt-2"><strong className="text-textPrimary">Focus:</strong> {week.focus}</p>
              <ul className="mt-4 list-disc list-inside text-sm space-y-2 text-textSecondary">
                {week.goals.map((goal, j) => <li key={j}>{goal}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Revision Schedule */}
      <section>
        <h2 className="text-2xl font-bold text-warning mb-6 border-b border-card pb-4 flex items-center gap-2">🔥 Final Revision Schedule</h2>
        <div className="bg-surface p-2 rounded-2xl shadow-lg border border-card">
          <ul className="divide-y divide-card">
            {plan.revisionSchedule.map((rev, i) => (
              <li key={i} className="p-4 flex flex-col md:flex-row md:items-center gap-2 hover:bg-background/50 transition-colors">
                <span className="font-bold text-textPrimary md:w-32">{rev.date}</span>
                <span className="font-bold text-warning md:w-48">{rev.subject}</span>
                <span className="text-textSecondary">{rev.topic}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Daily Plan */}
      <section>
        <h2 className="text-2xl font-bold text-textPrimary mb-6 border-b border-card pb-4">Daily Tasks</h2>
        <div className="space-y-6">
          {plan.dailyPlan.map((day, i) => (
            <div key={i} className="bg-surface p-6 rounded-2xl shadow-lg border border-card">
              <h3 className="font-bold text-textPrimary text-lg">{new Date(day.day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <ul className="mt-4 list-disc list-inside text-sm text-textSecondary space-y-2">
                {day.tasks.map((task, j) => <li key={j}>{task}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}